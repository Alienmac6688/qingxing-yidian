import csv
import tempfile
import unittest
from pathlib import Path
from scripts.audit_g2_cross_tabs import audit

HEADER = ["序号", "原始信息来源", "原文", "检测点", "催眠", "催醒"]

class CrossTabAuditTests(unittest.TestCase):
    def test_cross_tab_text_and_tab_scoped_ids(self):
        with tempfile.TemporaryDirectory() as directory:
            paths = []
            for name, rows in [
                ("从头复核", [["1", "G2", "Ａ B", "检测", "催眠", "催醒"],
                           ["1", "G2", "不同", "检测", "催眠", "催醒"]]),
                ("逐句证据对照", [["1", "G2", "AB", "检测", "催眠", "催醒"]]),
            ]:
                path = Path(directory) / (name + ".csv")
                with path.open("w", encoding="utf-8", newline="") as f:
                    writer = csv.writer(f)
                    writer.writerow(HEADER)
                    writer.writerows(rows)
                paths.append(path)
            result = audit(paths)
            self.assertEqual(result["total_rows"], 3)
            self.assertEqual(len(result["duplicate_ids_within_tab"]), 1)
            self.assertEqual(len(result["duplicate_text_across_tabs"]), 1)
            self.assertEqual(result["unique_original_fingerprints"], 2)
            self.assertFalse(result["publish_ready"])

    def test_missing_columns_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "bad.csv"
            path.write_text("序号,原文\n1,内容\n", encoding="utf-8")
            with self.assertRaises(ValueError):
                audit([path])

if __name__ == "__main__":
    unittest.main()
