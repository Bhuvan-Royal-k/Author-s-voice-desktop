import os
import sys
import subprocess
import time
import webbrowser
import signal

def check_python_dependencies():
    print("Checking backend Python dependencies...")
    venv_python = os.path.join("venv", "Scripts", "python.exe") if sys.platform == "win32" else os.path.join("venv", "bin", "python")
    
    if not os.path.exists(venv_python):
        print("Python virtual environment not found. Setting up...")
        subprocess.run([sys.executable, "-m", "venv", "venv"], check=True)
        
    # Install dependencies
    pip_path = os.path.join("venv", "Scripts", "pip.exe") if sys.platform == "win32" else os.path.join("venv", "bin", "pip")
    reqs = ["edge-tts", "fastapi", "uvicorn", "pypdf", "python-docx", "charset-normalizer", "aiohttp", "httpx"]
    subprocess.run([pip_path, "install"] + reqs, check=True)

def check_node_dependencies():
    print("Checking frontend Node dependencies...")
    node_modules = os.path.join("frontend", "node_modules")
    if not os.path.exists(node_modules):
        print("Frontend dependencies (node_modules) not found. Running npm install...")
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        subprocess.run([npm_cmd, "install"], cwd="frontend", shell=True, check=True)

def main():
    # Make sure we're in the workspace root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    try:
        check_python_dependencies()
        check_node_dependencies()
    except subprocess.CalledProcessError as e:
        print("Error installing dependencies:", e)
        sys.exit(1)

    print("\nStarting Author Voice...")
    
    backend_process = None
    frontend_process = None
    
    python_exe = os.path.join("venv", "Scripts", "python.exe") if sys.platform == "win32" else os.path.join("venv", "bin", "python")
    
    try:
        # 1. Start FastAPI backend
        print("Launching local backend on port 8000...")
        backend_process = subprocess.Popen(
            [python_exe, "-m", "uvicorn", "backend.app:app", "--host", "127.0.0.1", "--port", "8000"]
        )
        
        # Give backend a moment to boot
        time.sleep(1.5)
        
        # 2. Start React frontend via Vite
        print("Launching frontend dev server on port 5173...")
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        frontend_process = subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd="frontend",
            shell=True
        )
        
        # Give frontend a moment to boot
        time.sleep(1.5)
        
        # 3. Open browser
        print("Opening browser...")
        webbrowser.open("http://localhost:5173")
        
        print("\nAuthor Voice is running!")
        print("Press Ctrl+C to stop the application.")
        
        # Keep running until Ctrl+C
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nStopping Author Voice services...")
    finally:
        # Gracefully terminate child processes
        if backend_process:
            print("Stopping backend service...")
            if sys.platform == "win32":
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(backend_process.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                os.killpg(os.getpgid(backend_process.pid), signal.SIGTERM)
                
        if frontend_process:
            print("Stopping frontend service...")
            if sys.platform == "win32":
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(frontend_process.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                os.killpg(os.getpgid(frontend_process.pid), signal.SIGTERM)
                
        print("Author Voice stopped. Goodbye!")

if __name__ == "__main__":
    main()
