"""Render adapter for the approved 1916x1080 plate and 1920x1080 clip sources.

The audited screen_fog.py bytes, mask computation and composite remain unchanged.
Only plate media validation differs: its approved dimensions are1916x1080.
"""
from pathlib import Path
import json
import subprocess
import sys
import screen_fog


original_probe = screen_fog.probe


def probe_with_approved_plate(path):
    if Path(path).resolve() != screen_fog.PLATE.resolve():
        return original_probe(path)
    data = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_streams', '-of', 'json', str(path)]))
    stream = next(x for x in data['streams'] if x['codec_type'] == 'video')
    assert (int(stream['width']), int(stream['height'])) == (1916, 1080)
    assert stream['r_frame_rate'] == '24/1'
    assert int(stream['nb_frames']) == 145
    return stream


if __name__ == '__main__':
    assert '--render' in sys.argv, 'Use screen_fog.py directly for mask audits'
    screen_fog.probe = probe_with_approved_plate
    # Validate the exact real plate before creating an output folder.
    plate_probe = probe_with_approved_plate(screen_fog.PLATE)
    screen_fog.main()
    cid = sys.argv[sys.argv.index('--clip') + 1]
    path = screen_fog.RUN / 'processed' / cid / 'validation.json'
    data = json.loads(path.read_text())
    data.update(render_adapter=str(Path(__file__).resolve()),
                render_adapter_sha256=screen_fog.sha(__file__),
                plate_video=plate_probe,
                adapter_note='Approved plate is1916x1080; source/output remain1920x1080. Mask and atmosphere blend unchanged from exact approved audit.')
    screen_fog.write_json(path, data)
