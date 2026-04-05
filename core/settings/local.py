"""
Local development settings.
"""
from .base import *  # noqa: F401, F403

DEBUG = True

# Allow all hosts in local dev
ALLOWED_HOSTS = ["*"]
