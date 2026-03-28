import subprocess
import os
import re
import time
import sys

def get_tunnel():
    print("[Tunnel] Starting SSH tunnel to serveo.net...")
    proc = subprocess.Popen(
        ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null", 
         "-o", "ServerAliveInterval=60", "-R", f"80:localhost:{config.PORT}", "serveo.net"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )

    url = None
    timeout = time.time() + 15
    while time.time() < timeout:
        line = proc.stdout.readline()
        if not line:
            time.sleep(0.1)
            continue
        print(f"[SSH] {line.strip()}")
        
        match = re.search(r'(https://[^\s\x1b]+)', line)
        if match:
            url = match.group(1)
            break

    if url:
        print(f"[Tunnel] Successfully acquired URL: {url}")
        os.environ["TUNNEL_URL"] = url
        
        # Now replace the current process with the real backend
        print("[Tunnel] Starting backend...")
        os.execv(sys.executable, [sys.executable, "main.py"])
    else:
        print("[Tunnel] Failed to get URL in 15 seconds")
        proc.kill()
        sys.exit(1)

if __name__ == "__main__":
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    import config
    # Ensure active port is free first
    print(f"[Tunnel] Cleaning up old processes on port {config.PORT}...")
    subprocess.run(f"lsof -ti :{config.PORT} | xargs kill -9 2>/dev/null", shell=True)
    subprocess.run("pkill -f serveo 2>/dev/null", shell=True)
    get_tunnel()
