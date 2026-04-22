import os
import sys

# Add the backend directory to the Python path so absolute imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.main import app

# This file is used entirely as an entry point for Vercel's serverless environment.
# Vercel's @vercel/python builder looks for the 'app' variable by default.
