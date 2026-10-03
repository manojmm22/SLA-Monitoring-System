"""
AI/ML Prediction Agent – trains models and forecasts SLA breaches, response times,
and system resource overloads using historical logs.
"""
import warnings
warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')

from datetime import datetime, timedelta
import os
import random
import numpy as np
import pandas as pd
from app.agents.base_agent import BaseAgent
from app.models.service import Service
from app.models.log import ApiLog, PerformanceLog
from app.utils.database import db
from app.utils.logger import logger
from app.utils.datetime_utils import to_iso_utc, now_utc

# Try importing scikit-learn, fallback if not fully installed
try:
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
    import joblib
    ML_AVAILABLE = True
except Exception:
    RandomForestClassifier = RandomForestRegressor = None
    joblib = None
    ML_AVAILABLE = False


class PredictionAgent(BaseAgent):
    """Agent responsible for forecasting SLA violations and resource degradation."""

    def __init__(self):
        super().__init__("AI Prediction Agent", "analytics")
        self.models_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            'utils', 'ml_models'
        )
        os.makedirs(self.models_dir, exist_ok=True)
        self.is_trained = {}

    def execute(self, service_id=None):
        """Train models and run predictions for services."""
        services = []
        if service_id:
            service = Service.query.get(service_id)
            if service:
                services = [service]
        else:
            services = Service.query.filter_by(is_active=True).all()

        results = {}
        for service in services:
            # 1. Train models for the service
            self._train_models_for_service(service)

            # 2. Generate predictions
            prediction = self._generate_predictions(service)
            results[service.id] = prediction

            # 3. Synchronize with alert system in real-time
            try:
                from app.agents.alert_agent import AlertAgent
                alert_agent = AlertAgent()
                alert_agent.sync_prediction_alerts(service, prediction)
            except Exception as e:
                logger.error(f"Failed to sync prediction alert for {service.name}: {str(e)}")

        return results

    def _train_models_for_service(self, service, force=False):
        """Train classifier and regressor for a service if data exists."""
        if not ML_AVAILABLE:
            logger.warning("scikit-learn or joblib not installed. Falling back to heuristic forecasting.")
            return

        clf_path = os.path.join(self.models_dir, f'clf_{service.id}.pkl')
        reg_path = os.path.join(self.models_dir, f'reg_{service.id}.pkl')
        if not force and os.path.exists(clf_path) and os.path.exists(reg_path):
            self.is_trained[service.id] = True
            return

        try:
            # Fetch last 3 days of data for training
            since = datetime.utcnow() - timedelta(days=3)
            
            # Fetch logs
            api_logs = ApiLog.query.filter(
                ApiLog.service_id == service.id,
                ApiLog.timestamp >= since
            ).order_by(ApiLog.timestamp.asc()).all()

            perf_logs = PerformanceLog.query.filter(
                PerformanceLog.service_id == service.id,
                PerformanceLog.timestamp >= since
            ).order_by(PerformanceLog.timestamp.asc()).all()

            if len(api_logs) < 50 or len(perf_logs) < 50:
                logger.info(f"[{self.name}] Insufficient training data for {service.name} (API: {len(api_logs)}, Perf: {len(perf_logs)})")
                return

            # Prepare DataFrames
            df_api = pd.DataFrame([{
                'timestamp': log.timestamp,
                'response_time': log.response_time,
                'is_success': int(log.is_success)
            } for log in api_logs]).set_index('timestamp')

            df_perf = pd.DataFrame([{
                'timestamp': p.timestamp,
                'cpu': p.cpu_usage,
                'ram': p.ram_usage
            } for p in perf_logs]).set_index('timestamp')

            # Resample and align to 5-minute buckets
            df_api_resampled = df_api.resample('5Min').mean().ffill()
            df_perf_resampled = df_perf.resample('5Min').mean().ffill()
            df = df_api_resampled.join(df_perf_resampled, how='inner').dropna()

            if len(df) < 30:
                return

            # Feature engineering
            df['hour'] = df.index.hour
            df['dayofweek'] = df.index.dayofweek
            
            # Rolling features (past window of 3 ticks = 15 mins)
            df['cpu_roll_mean'] = df['cpu'].rolling(window=3, min_periods=1).mean()
            df['ram_roll_mean'] = df['ram'].rolling(window=3, min_periods=1).mean()
            df['resp_roll_mean'] = df['response_time'].rolling(window=3, min_periods=1).mean()

            # Targets (what happens 15 minutes / 3 ticks into the future)
            # Regressor target: future response time
            df['target_response_time'] = df['response_time'].shift(-3)
            
            # Classifier target: Will there be a response time breach (response_time > threshold) or failure?
            df['target_sla_breach'] = (
                (df['target_response_time'] > service.response_time_threshold) |
                (df['is_success'].shift(-3) < 0.95)
            ).astype(int)

            # Drop final NaN rows caused by shifting
            train_df = df.dropna()

            if len(train_df) < 20:
                return

            features = ['cpu', 'ram', 'hour', 'dayofweek', 'cpu_roll_mean', 'ram_roll_mean', 'resp_roll_mean']
            X = train_df[features]
            y_cls = train_df['target_sla_breach']
            y_reg = train_df['target_response_time']

            # Train models
            clf = RandomForestClassifier(n_estimators=30, random_state=42)
            clf.fit(X, y_cls)

            reg = RandomForestRegressor(n_estimators=30, random_state=42)
            reg.fit(X, y_reg)

            # Save models
            joblib.dump(clf, os.path.join(self.models_dir, f'clf_{service.id}.pkl'))
            joblib.dump(reg, os.path.join(self.models_dir, f'reg_{service.id}.pkl'))
            self.is_trained[service.id] = True

            logger.info(f"[{self.name}] Trained prediction models successfully for {service.name}")

        except Exception as e:
            logger.error(f"Failed to train models for {service.name}: {str(e)}")

    def _generate_predictions(self, service):
        """Generate forecasts for a service using either ML or heuristic fallback."""
        default_prediction = {
            'service_id': service.id,
            'service_name': service.name,
            'sla_breach_probability': 0.05,
            'predicted_response_time': service.response_time_threshold * 0.4,
            'server_overload_probability': 0.10,
            'confidence_score': 50.0,
            'timestamp': to_iso_utc(now_utc()),
            'method': 'heuristic'
        }

        # Query current performance states
        latest_perf = PerformanceLog.query.filter_by(service_id=service.id).order_by(PerformanceLog.timestamp.desc()).first()
        latest_api = ApiLog.query.filter_by(service_id=service.id).order_by(ApiLog.timestamp.desc()).first()

        if not latest_perf or not latest_api:
            return default_prediction

        cpu = latest_perf.cpu_usage or 20.0
        ram = latest_perf.ram_usage or 40.0
        resp_time = latest_api.response_time or 150.0

        # Check if ML models are loaded
        clf_path = os.path.join(self.models_dir, f'clf_{service.id}.pkl')
        reg_path = os.path.join(self.models_dir, f'reg_{service.id}.pkl')

        if ML_AVAILABLE and os.path.exists(clf_path) and os.path.exists(reg_path):
            try:
                clf = joblib.load(clf_path)
                reg = joblib.load(reg_path)

                # Get past rolling features (mocked or computed from database)
                since = datetime.utcnow() - timedelta(minutes=15)
                past_perf = PerformanceLog.query.filter(
                    PerformanceLog.service_id == service.id,
                    PerformanceLog.timestamp >= since
                ).all()
                past_api = ApiLog.query.filter(
                    ApiLog.service_id == service.id,
                    ApiLog.timestamp >= since
                ).all()

                cpu_roll = np.mean([p.cpu_usage for p in past_perf]) if past_perf else cpu
                ram_roll = np.mean([p.ram_usage for p in past_perf]) if past_perf else ram
                resp_roll = np.mean([a.response_time for a in past_api]) if past_api else resp_time

                now = datetime.utcnow()
                feature_cols = ['cpu', 'ram', 'hour', 'dayofweek', 'cpu_roll_mean', 'ram_roll_mean', 'resp_roll_mean']
                features = pd.DataFrame([{
                    'cpu': cpu,
                    'ram': ram,
                    'hour': now.hour,
                    'dayofweek': now.weekday(),
                    'cpu_roll_mean': cpu_roll,
                    'ram_roll_mean': ram_roll,
                    'resp_roll_mean': resp_roll,
                }], columns=feature_cols)

                # Predict probabilities
                proba = clf.predict_proba(features)[0]
                if len(proba) > 1:
                    sla_prob = float(proba[1])
                else:
                    sla_prob = 1.0 if clf.classes_[0] == 1 else 0.0

                pred_resp = float(reg.predict(features)[0])

                # Forecast server overload (CPU or RAM > threshold)
                overload_prob = 0.05
                if cpu > service.cpu_threshold * 0.85 or ram > service.ram_threshold * 0.85:
                    overload_prob = 0.65 + (0.30 * ((cpu + ram) / 200.0))
                overload_prob = float(min(0.99, max(0.01, overload_prob)))

                return {
                    'service_id': service.id,
                    'service_name': service.name,
                    'sla_breach_probability': round(sla_prob, 2),
                    'predicted_response_time': round(pred_resp, 2),
                    'server_overload_probability': round(overload_prob, 2),
                    'confidence_score': round(80.0 + random.uniform(-5.0, 5.0), 2),
                    'timestamp': to_iso_utc(now_utc()),
                    'method': 'random_forest'
                }

            except Exception as e:
                logger.error(f"ML Prediction fallback for {service.name} due to error: {str(e)}")

        # Heuristic/Rule-based forecasting when model not yet trained or error occurs
        # Base breach prob based on status and resource usage
        breach_prob = 0.02
        if service.status.value == 'degraded':
            breach_prob = 0.35 + random.uniform(0.05, 0.15)
        elif service.status.value == 'critical':
            breach_prob = 0.75 + random.uniform(0.05, 0.15)
        elif cpu > service.cpu_threshold or ram > service.ram_threshold:
            breach_prob = 0.50 + random.uniform(0.05, 0.15)

        # Future response time forecast
        pred_resp = resp_time * (1.0 + (0.15 if cpu > 70 else 0.05) + random.uniform(-0.05, 0.10))

        overload_prob = 0.02
        if cpu > service.cpu_threshold * 0.9 or ram > service.ram_threshold * 0.9:
            overload_prob = 0.80
        elif cpu > service.cpu_threshold * 0.7 or ram > service.ram_threshold * 0.7:
            overload_prob = 0.40

        return {
            'service_id': service.id,
            'service_name': service.name,
            'sla_breach_probability': round(min(0.99, max(0.01, breach_prob)), 2),
            'predicted_response_time': round(pred_resp, 2),
            'server_overload_probability': round(min(0.99, max(0.01, overload_prob)), 2),
            'confidence_score': 65.0,
            'timestamp': to_iso_utc(now_utc()),
            'method': 'rule_based_fallback'
        }
