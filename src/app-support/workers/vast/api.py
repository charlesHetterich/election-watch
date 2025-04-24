
import vastai_sdk
import subprocess
from typing import Optional
import argparse
import json

vast_sdk  = vastai_sdk.VastAI()

def search(
    gpu_name: str = "RTX_3090",
    reliability: float = 0.99,
    num_gpus: int = 1,
    min_ram_gb: int = 8,
    max_usd_per_hr: float = 1,
):
    result = subprocess.run(f"""
        vastai search offers ' \
            gpu_name={gpu_name} \
            reliability>{reliability} \
            num_gpus={num_gpus} \
            cpu_ram>={min_ram_gb} \
        '
    """, shell=True, capture_output=True, text=True)
    
    err = result.stderr.strip().splitlines()
    lines = result.stdout.strip().splitlines()
    headers = lines[0].split()

    data_lines = lines[1:]
    rows = list(filter(
        lambda offer: float(offer['$/hr']) <= max_usd_per_hr,
        iter([dict(zip(headers, line.split(None, len(headers)-1))) for line in data_lines]),
    ))
    return (rows, err)


def launch(machine_id: str) -> int:
     return vast_sdk.create_instance(
        id=machine_id,
        disk=100,
        image='pytorch/pytorch:latest',
        onstart_cmd="bash -c 'echo Running my work...; python /path/to/your_script.py; vastai stop instance \$CONTAINER_ID'",
        ssh=True,
    )['new_contract']
    
def destroy(machine_id: str):

    cmd = f"vastai destroy instance {machine_id}"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    
    out = result.stdout.strip()
    err = result.stderr.strip()
    return len(err) == 0 and len(out) > 0 and not out.startswith("failed")

def try_launch(
    gpu_name: str = "RTX_3090",
    reliability: float = 0.99,
    num_gpus: int = 1,
    min_ram_gb: int = 8,
    max_usd_per_hr: float = 1,
) -> Optional[str]:
    (offers, _) = search(
        gpu_name=gpu_name,
        reliability=reliability,
        num_gpus=num_gpus,
        min_ram_gb=min_ram_gb,
        max_usd_per_hr=max_usd_per_hr,
    )

    if len(offers) < 1:
        return None
    return launch(offers[0]['ID'])

def main():
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)

    t = sub.add_parser("try_launch")
    t.add_argument("--gpu_name",       type=str,   default="RTX_3090")
    t.add_argument("--reliability",    type=float, default=0.99)
    t.add_argument("--num_gpus",       type=int,   default=1)
    t.add_argument("--min_ram_gb",     type=int,   default=8)
    t.add_argument("--max_usd_per_hr", type=float, default=1.0)

    d = sub.add_parser("destroy")
    d.add_argument("machine_id", type=str)

    args = p.parse_args()

    if args.cmd == "try_launch":
        out = try_launch(
            gpu_name    = args.gpu_name,
            reliability = args.reliability,
            num_gpus    = args.num_gpus,
            min_ram_gb  = args.min_ram_gb,
            max_usd_per_hr = args.max_usd_per_hr,
        )
        print(json.dumps({"result": out}))
    else:  # destroy
        ok = destroy(args.machine_id)
        print(json.dumps({"result": ok}))

if __name__ == "__main__":
    main()
