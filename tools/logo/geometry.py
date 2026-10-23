"""Mellow Sounds headset mark.

Traced from the owner's logo (double headband, ear-shaped cups, five-bar waveform) and cleaned:
the outer band is joined to the ear-cups (no break), pixel wobble is smoothed out, and every part
is a single closed outline. The organic shapes are the original's; they are kept on purpose.
Source of truth: trace_data.json (made by tracing the logo, see README). Coordinates: x centred
on 0, y down, design units (~770 wide, ~777 tall).
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
_t = json.load(open(os.path.join(HERE, "trace_data.json")))

X0, X1, Y0, Y1 = _t["x0"], _t["x1"], _t["y0"], _t["y1"]
CY = (Y0 + Y1) / 2

FRAME_D = _t["frame"]                      # headband + ear-cups (holes by winding)
BARS = _t["bars"]                          # five waveform bars, left to right: {d, x, y0, y1}
MARK_D = " ".join([FRAME_D] + [b["d"] for b in BARS])
