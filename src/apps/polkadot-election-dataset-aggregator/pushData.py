from huggingface_hub import HfApi, login
import os
import sys

def expect_env_var(var_name):
    var = os.getenv(var_name)
    if not var:
        raise ValueError(f"expected environment variable {var_name} but found None")
    return var

# Establish HF client
token = expect_env_var("HF_TOKEN")
repo_name = expect_env_var("REPO_NAME")
login(token)
api = HfApi()

if __name__ == "__main__":
    # Validate args
    if len(sys.argv) != 2:
        print("Usage: python pushData.py <data-dir>")
        sys.exit(1)

    # Push data to HF dataset
    api.upload_folder(
        folder_path=sys.argv[1],
        path_in_repo=f"data",
        repo_id=repo_name,
        repo_type="dataset"
    )