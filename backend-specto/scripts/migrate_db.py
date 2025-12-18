import os
import sys
import subprocess

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def run_migrations():
    print("--- Running Database Migrations ---")
    
    # Check if DATABASE_URL is set
    if not os.getenv("DATABASE_URL"):
        print("ERROR: DATABASE_URL environment variable is not set.")
        print("Please set it in your .env file or export it in your terminal.")
        print("Example: export DATABASE_URL='postgresql://user:pass@host:port/dbname'")
        return

    try:
        # Run alembic upgrade head
        # We need to run this from the backend-specto directory where alembic.ini is
        cwd = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # Use python -m alembic to ensure we use the installed module
        subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=cwd, check=True)
        print("--- Migrations applied successfully! ---")
    except subprocess.CalledProcessError as e:
        print(f"ERROR: Migration failed with exit code {e.returncode}")
    except Exception as e:
        print(f"ERROR: An unexpected error occurred: {e}")

if __name__ == "__main__":
    run_migrations()
