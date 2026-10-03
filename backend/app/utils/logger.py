import logging
import sys
from datetime import datetime
from pathlib import Path


class ColoredFormatter(logging.Formatter):
    COLORS = {
        'DEBUG': '[36m',
        'INFO': '[32m',
        'WARNING': '[33m',
        'ERROR': '[31m',
        'CRITICAL': '[35m',
        'RESET': '[0m'
    }

    def format(self, record):
        color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
        reset = self.COLORS['RESET']
        record.levelname = f"{color}{record.levelname}{reset}"
        return super().format(record)


def setup_logger(name='sla_monitor', level=logging.INFO):
    logger = logging.getLogger(name)
    logger.setLevel(level)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)

        formatter = ColoredFormatter(
            '[%(asctime)s] %(levelname)s | %(name)s | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

        # File handler
        log_dir = Path('logs')
        log_dir.mkdir(exist_ok=True)
        file_handler = logging.FileHandler(log_dir / f'{name}_{datetime.now().strftime("%Y%m%d")}.log')
        file_handler.setLevel(level)
        file_handler.setFormatter(logging.Formatter(
            '[%(asctime)s] %(levelname)s | %(name)s | %(message)s'
        ))
        logger.addHandler(file_handler)

    return logger


logger = setup_logger()
