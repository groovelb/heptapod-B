"""Synthetic mask/isolation checks only; no source video is rendered."""
import json
from pathlib import Path
import unittest
import cv2
import numpy as np
import screen_fog as fog


def scene(box=(640, 180, 1280, 420)):
    frame = np.full((fog.H, fog.W, 3), 35, np.uint8)
    cv2.rectangle(frame, box[:2], box[2:], (222, 225, 228), -1)
    return frame


class IsolationTests(unittest.TestCase):
    def test_c04_early_sky_never_selected(self):
        frame = np.full((fog.H, fog.W, 3), 230, np.uint8)
        for n in [0, 36, 71]:
            alpha, row = fog.mask_for(frame, 'C04', n)
            self.assertFalse(np.any(alpha))
            self.assertEqual(row['reason'], 'before_interior_time_gate')

    def test_c04_late_sky_still_rejected(self):
        frame = scene((850, 60, 1060, 100))
        frame[750:] = 220
        alpha, row = fog.mask_for(frame, 'C04', 100)
        self.assertFalse(np.any(alpha))
        self.assertEqual(row['reason'], 'bright_exterior_still_visible')

    def test_no_target_and_tiny_target_skip(self):
        for frame in [np.zeros((fog.H, fog.W, 3), np.uint8), scene((950, 60, 964, 67))]:
            alpha, row = fog.mask_for(frame, 'C04', 100)
            self.assertFalse(np.any(alpha))
            self.assertFalse(row['accepted'])

    def test_candidate_must_be_wholly_inside_roi(self):
        frame = scene((0, 90, 900, 350))
        alpha, row = fog.mask_for(frame, 'C07', 20)
        self.assertFalse(np.any(alpha))

    def test_two_panels_are_ambiguous(self):
        frame = scene((500, 120, 800, 220))
        cv2.rectangle(frame, (1000, 120), (1300, 220), (230, 230, 230), -1)
        alpha, row = fog.mask_for(frame, 'C07', 20)
        self.assertFalse(np.any(alpha))
        self.assertEqual(row['reason'], 'ambiguous_multiple_surfaces')

    def test_people_and_rim_protected_and_composite_isolated(self):
        frame = scene()
        # Foreground silhouette partly obscures the screen, as in C07 OUT.
        cv2.rectangle(frame, (890, 340), (1010, 800), (30, 30, 30), -1)
        alpha, row = fog.mask_for(frame, 'C07', 30)
        self.assertTrue(row['accepted'])
        self.assertFalse(np.any(alpha[336:805, 886:1015]))
        self.assertFalse(np.any(alpha[180:185, 640:1280]))
        rng = np.random.default_rng(123)
        plate = rng.integers(0, 255, (fog.H, fog.W, 3), dtype=np.uint8)
        result = fog.compose(frame, plate, alpha, row['bounds'])
        self.assertTrue(np.array_equal(result[alpha == 0], frame[alpha == 0]))
        self.assertTrue(np.any(result[alpha > 0] != frame[alpha > 0]))

    def test_empty_mask_is_byte_exact_passthrough(self):
        src = scene()
        result = fog.compose(src, src, np.zeros((fog.H, fog.W), np.float32), None)
        self.assertTrue(np.array_equal(result, src))


if __name__ == '__main__':
    cv2.setNumThreads(2)
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(IsolationTests))
    report = {'tests_run': result.testsRun, 'successful': result.wasSuccessful(),
              'failures': len(result.failures), 'errors': len(result.errors),
              'scope': 'Synthetic mask and byte-isolation checks only; no real source render.',
              'script_sha256': fog.sha(Path(fog.__file__)), 'opencv': cv2.__version__, 'numpy': np.__version__}
    fog.write_json(fog.RUN / 'qa/B/effect-script-tests.json', report)
    raise SystemExit(0 if result.wasSuccessful() else 1)
