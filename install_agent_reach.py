import os
import sys

# Add Node.js and Scripts to PATH
os.environ['PATH'] = r'C:\Users\12132\AppData\Roaming\Python\Python312\Scripts;D:\Node.js;' + os.environ.get('PATH', '')
os.environ['PYTHONIOENCODING'] = 'utf-8'

# Set UTF-8 encoding for stdout/stderr
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Now run the installer (full mode)
from agent_reach.cli import main
sys.argv = ['agent-reach', 'install', '--env=auto']
main()
