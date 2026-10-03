import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 755, "Multi-Agent SLA Monitoring System - Presentation & System Guide")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 748, 558, 748)
        
        # Footer
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 45, 558, 45)
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 32, page_str)
        self.drawString(54, 32, "Confidential - Project Documentation & Presentation Prep")
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#0F172A")
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#0284C7")
    )
    
    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=12,
        spaceAfter=6
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=8,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155")
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    quote_style = ParagraphStyle(
        'Quote',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#0369A1"),
        spaceBefore=4,
        spaceAfter=4
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1E293B")
    )

    story = []

    # Title block
    story.append(Paragraph("Multi-Agent SLA Monitoring System", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Comprehensive Project Architecture, Modules & PPT Presentation Guide", subtitle_style))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#0284C7"), spaceBefore=2, spaceAfter=12))

    # Section 1: Executive Summary
    story.append(Paragraph("1. Executive Summary & 30-Second Elevator Pitch", h1_style))
    quote_text = (
        '"This project is an Autonomous Multi-Agent SLA Monitoring System. Instead of human engineers staring '
        'at dashboards 24/7, our system deploys a team of specialized software agents that continuously track '
        'service health, predict failures before they happen, send instant alerts, and even self-heal broken '
        'services automatically."'
    )
    quote_box = [[Paragraph(quote_text, quote_style)]]
    t_quote = Table(quote_box, colWidths=[504])
    t_quote.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F0F9FF")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#BAE6FD")),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_quote)
    story.append(Spacer(1, 10))

    # Section 2: Problem & Solution
    story.append(Paragraph("2. Problem Statement & Proposed Solution", h1_style))
    prob_sol_data = [
        [
            Paragraph("<b>The Problem (Traditional Monitoring)</b>", body_bold),
            Paragraph("<b>The Solution (Multi-Agent Platform)</b>", body_bold)
        ],
        [
            Paragraph("• Reactive: Only warns after a service has crashed.<br/>"
                      "• High MTTD (Detection) & MTTR (Recovery).<br/>"
                      "• Expensive 24/7 human oversight required.<br/>"
                      "• Complex SLA contracts are difficult to track manually.", body_style),
            Paragraph("• Proactive: ML forecasts breaches before they occur.<br/>"
                      "• Self-healing: Automated recovery actions & restarts.<br/>"
                      "• Multi-agent teamwork: Specialized autonomous agents.<br/>"
                      "• Automated compliance reporting in PDF and Excel.", body_style)
        ]
    ]
    t_prob = Table(prob_sol_data, colWidths=[246, 258])
    t_prob.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor("#FEF2F2")),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor("#F0FDF4")),
        ('BACKGROUND', (0, 1), (0, 1), colors.HexColor("#FFF5F5")),
        ('BACKGROUND', (1, 1), (1, 1), colors.HexColor("#F7FEE7")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_prob)
    story.append(Spacer(1, 12))

    # Section 3: Software & Technology Stack
    story.append(Paragraph("3. Software & Technologies Used", h1_style))
    tech_data = [
        [Paragraph("Layer", table_header), Paragraph("Technologies & Tools", table_header), Paragraph("Key Role / Purpose", table_header)],
        [
            Paragraph("<b>Frontend</b>", table_cell),
            Paragraph("React 18, TypeScript, Vite 5, Material-UI (MUI v5), Recharts, Lucide Icons", table_cell),
            Paragraph("Modern, responsive single-page dashboard with dark mode and real-time visualization.", table_cell)
        ],
        [
            Paragraph("<b>Backend API</b>", table_cell),
            Paragraph("Python 3, Flask 3.0, Flask-JWT-Extended, Flask-CORS, Flask-Limiter, bcrypt", table_cell),
            Paragraph("Modular REST API blueprints with secure JWT role-based access control.", table_cell)
        ],
        [
            Paragraph("<b>Agents & Automation</b>", table_cell),
            Paragraph("APScheduler, psutil, Background Orchestrator", table_cell),
            Paragraph("Schedules and runs autonomous agents for metric collection and self-healing.", table_cell)
        ],
        [
            Paragraph("<b>AI / ML & Analytics</b>", table_cell),
            Paragraph("Scikit-Learn, Joblib, Pandas, NumPy", table_cell),
            Paragraph("Predictive failure analysis, breach likelihood forecasting, and time-series calculations.", table_cell)
        ],
        [
            Paragraph("<b>Database & Storage</b>", table_cell),
            Paragraph("SQLite (local dev), PostgreSQL / MySQL support, SQLAlchemy 2.0 ORM, Redis", table_cell),
            Paragraph("Relational schema for service logs, alerts, SLAs, recovery history, and caching.", table_cell)
        ],
        [
            Paragraph("<b>Reporting & Export</b>", table_cell),
            Paragraph("ReportLab (PDF), OpenPyXL (Excel), Pandas (CSV)", table_cell),
            Paragraph("Generates automated compliance reports with tables and performance graphs.", table_cell)
        ]
    ]
    t_tech = Table(tech_data, colWidths=[90, 204, 210])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#94A3B8")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_tech)
    story.append(Spacer(1, 14))

    story.append(PageBreak())

    # Section 4: The Multi-Agent Team
    story.append(Paragraph("4. The Multi-Agent Team (Roles & Analogies)", h1_style))
    agent_data = [
        [Paragraph("Agent Name", table_header), Paragraph("Real-World Analogy", table_header), Paragraph("Functional Responsibility", table_header)],
        [
            Paragraph("<b>Response Tracker</b>", table_cell),
            Paragraph("<i>The Stopwatch Operator</i>", table_cell),
            Paragraph("Pings endpoints every 30s to measure latency, HTTP status codes, and network reachability.", table_cell)
        ],
        [
            Paragraph("<b>Resource Monitor</b>", table_cell),
            Paragraph("<i>The Hardware Doctor</i>", table_cell),
            Paragraph("Monitors host server hardware health: CPU load, RAM usage, and Disk space limits.", table_cell)
        ],
        [
            Paragraph("<b>Time Analyzer</b>", table_cell),
            Paragraph("<i>The Statistician</i>", table_cell),
            Paragraph("Computes rolling latency percentiles (P50, P90, P99) and flags performance degradation trends.", table_cell)
        ],
        [
            Paragraph("<b>SLA Checker</b>", table_cell),
            Paragraph("<i>The Quality Auditor</i>", table_cell),
            Paragraph("Compares actual metrics against contract SLA policies (uptime, latency targets).", table_cell)
        ],
        [
            Paragraph("<b>Alert Agent</b>", table_cell),
            Paragraph("<i>The Emergency Dispatcher</i>", table_cell),
            Paragraph("Evaluates live metrics and live AI predictions to trigger real-time alerts and emails.", table_cell)
        ],
        [
            Paragraph("<b>Prediction Agent</b>", table_cell),
            Paragraph("<i>The Weather Forecaster</i>", table_cell),
            Paragraph("Uses trained Random Forest models to forecast upcoming SLA breaches 15-30 mins in advance.", table_cell)
        ],
        [
            Paragraph("<b>Root Cause Analyzer</b>", table_cell),
            Paragraph("<i>The Incident Detective</i>", table_cell),
            Paragraph("Correlates resource spikes and network errors to identify why an outage occurred.", table_cell)
        ],
        [
            Paragraph("<b>Recovery Agent</b>", table_cell),
            Paragraph("<i>The First-Aid Medic</i>", table_cell),
            Paragraph("Executes automated remediation scripts, service reboots, and self-healing recovery tasks.", table_cell)
        ],
        [
            Paragraph("<b>Report Agent</b>", table_cell),
            Paragraph("<i>The Corporate Secretary</i>", table_cell),
            Paragraph("Aggregates daily and weekly compliance numbers into executive-ready PDF/Excel documents.", table_cell)
        ]
    ]
    t_agent = Table(agent_data, colWidths=[120, 130, 254])
    t_agent.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0284C7")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#94A3B8")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_agent)
    story.append(Spacer(1, 12))

    # Section 5: Modules Architecture
    story.append(Paragraph("5. System Modules Breakdown", h1_style))
    mod_data = [
        [
            Paragraph("<b>Backend Route Blueprints</b>", h2_style),
            Paragraph("<b>Frontend View Modules</b>", h2_style)
        ],
        [
            Paragraph("• <b>Auth & Users</b>: JWT login, role management (Admin/Engineer/Viewer)<br/>"
                      "• <b>Services</b>: Service registry, endpoints, target configurations<br/>"
                      "• <b>Monitoring</b>: Telemetry streaming, live metrics, status checks<br/>"
                      "• <b>Alerts</b>: Live alert signal processing & AI prediction alert sync<br/>"
                      "• <b>Predictions</b>: ML breach likelihood forecasting API<br/>"
                      "• <b>Recovery</b>: Self-healing action execution and recovery audit logs<br/>"
                      "• <b>Reports</b>: PDF/Excel report generator and downloader<br/>"
                      "• <b>Analytics & Audit</b>: Percentile distributions and security audit trail", body_style),
            Paragraph("• <b>Dashboard</b>: High-level overview of SLA health, uptime, active incidents<br/>"
                      "• <b>Live Monitoring</b>: Real-time latency charts with auto-refresh<br/>"
                      "• <b>Services Management</b>: Add/edit endpoints and monitoring targets<br/>"
                      "• <b>Alert Center</b>: Filter alerts by severity and acknowledge issues<br/>"
                      "• <b>Predictions View</b>: Visual probability meter for upcoming breaches<br/>"
                      "• <b>Recovery Center</b>: Self-healing triggers and action logs<br/>"
                      "• <b>Reports Center</b>: Instant PDF and Excel export generation<br/>"
                      "• <b>User Admin & Settings</b>: User privileges and SLA threshold config", body_style)
        ]
    ]
    t_mod = Table(mod_data, colWidths=[246, 258])
    t_mod.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_mod)
    story.append(Spacer(1, 14))

    story.append(PageBreak())

    # Section 6: Slide-by-Slide PPT Guide
    story.append(Paragraph("6. Slide-by-Slide PowerPoint Presentation Deck", h1_style))
    slides = [
        ("Slide 1: Title & Introduction",
         "• Title: Autonomous Multi-Agent SLA Monitoring & Self-Healing Platform<br/>"
         "• Subtitle: Real-Time Telemetry, ML-Driven Predictions & Automated Remediation<br/>"
         "• Presenter: Your Name / Team Members"),
        ("Slide 2: The Problem in Modern IT Operations",
         "• Modern distributed services face frequent traffic spikes and intermittent downtime.<br/>"
         "• SLA breaches trigger severe contract penalties and loss of customer trust.<br/>"
         "• Traditional tools are passive: they notify humans after the crash has already occurred."),
        ("Slide 3: Our Solution - The Autonomous Multi-Agent Approach",
         "• An intelligent software team operating 24/7 without fatigue.<br/>"
         "• Continuous telemetry monitoring + ML predictive breach forecasting.<br/>"
         "• Automated self-healing actions that recover failing services in seconds."),
        ("Slide 4: System Architecture & Tech Stack",
         "• Frontend: React 18, TypeScript, Vite, Material UI (Dynamic dark mode UI)<br/>"
         "• Backend: Python Flask modular REST API with JWT security<br/>"
         "• Intelligence: Multi-Agent Orchestrator powered by APScheduler & Scikit-Learn<br/>"
         "• Database: SQLite / PostgreSQL with SQLAlchemy ORM"),
        ("Slide 5: Key Innovation & Features",
         "• Real-Time Monitoring: Live latency, CPU, and RAM tracking.<br/>"
         "• Predictive Analytics: Anticipates breaches 15-30 minutes ahead.<br/>"
         "• Self-Healing Engine: Automated reboots, failover triggers, and recovery logging.<br/>"
         "• Executive Reports: One-click export of compliance documents in PDF and Excel."),
        ("Slide 6: Conclusion & Business Value",
         "• Reduces Mean Time to Detect (MTTD) from minutes to seconds.<br/>"
         "• Dramatically cuts Mean Time to Recover (MTTR) via automated self-healing.<br/>"
         "• Guarantees 99.9%+ SLA compliance with minimal human intervention.")
    ]

    for title, content in slides:
        slide_block = [
            [Paragraph(f"<b>{title}</b>", body_bold)],
            [Paragraph(content, body_style)]
        ]
        t_slide = Table(slide_block, colWidths=[504])
        t_slide.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor("#F8FAFC")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(t_slide)
        story.append(Spacer(1, 6))

    story.append(Spacer(1, 8))

    # Section 7: Verbal Script
    story.append(Paragraph("7. Ready-to-Read Verbal Script (For Your Presentation)", h1_style))
    script_text = (
        '<b>Presenter:</b> "Good morning/afternoon everyone. Today, I am proud to present our project: '
        'the <b>Multi-Agent SLA Monitoring & Self-Healing Platform</b>.<br/><br/>'
        'In today’s digital economy, businesses rely on web services and APIs that must stay fast and available '
        'under strict Service Level Agreements (SLAs). Even a few minutes of downtime can mean tens of thousands '
        'of dollars in losses. Traditional monitoring tools only alert engineers after the damage is done.<br/><br/>'
        'Our project solves this by deploying an autonomous <b>Multi-Agent System</b>. Think of it as a 24/7 virtual '
        'operations team. One agent constantly tracks response times, another monitors CPU and memory health, and '
        'the SLA Checker compares performance against contractual rules. Most importantly, our <b>Prediction Agent</b> '
        'uses machine learning to forecast potential breaches before users experience slowdowns.<br/><br/>'
        'When an incident does occur, our <b>Recovery Agent</b> automatically executes self-healing procedures, while '
        'our <b>Report Agent</b> creates compliance reports in PDF and Excel. Everything is presented in an interactive '
        'React and Material UI dashboard with role-based security.<br/><br/>'
        'In conclusion, this project moves IT operations from being <i>reactive</i> to completely <i>proactive and '
        'self-healing</i>. Thank you, and I welcome any questions."'
    )
    t_script = Table([[Paragraph(script_text, body_style)]], colWidths=[504])
    t_script.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FEF9C3")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#FDE047")),
        ('PADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(t_script)

    doc.build(story, canvasmaker=NumberedCanvas)
    print("PDF generated successfully at:", filename)

if __name__ == "__main__":
    out_dir = r"D:\mm"
    out_file = os.path.join(out_dir, "SLA_Monitoring_System_Presentation_Guide.pdf")
    build_pdf(out_file)
