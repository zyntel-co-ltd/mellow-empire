"""Mellow Sounds headset mark, rebuilt as clean vector geometry.

Source: the owner's logo (double headband, ear-shaped cups, five-bar waveform), measured from the
screenshots and regularised: concentric tapered arcs, symmetric ears, evenly spaced pill bars.
Coordinates: x centred on 0, y downwards; design units (the logo is ~770 wide, ~780 tall).
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))

# Mark bounding box (design units)
X0, X1, Y0, Y1 = -385.0, 385.0, 35.0, 816.0
CY = (Y0 + Y1) / 2


def _arc_band(cx_y_out, r_out, cx_y_in, r_in, y_end):
    """Crescent between two circles (both centred on x=0), clipped at y_end, top half."""
    xo = math.sqrt(r_out ** 2 - (y_end - cx_y_out) ** 2)
    xi = math.sqrt(r_in ** 2 - (y_end - cx_y_in) ** 2)
    return (f"M{-xo:.2f} {y_end}A{r_out} {r_out} 0 1 1 {xo:.2f} {y_end}"
            f"L{xi:.2f} {y_end}A{r_in} {r_in} 0 1 0 {-xi:.2f} {y_end}Z")


OUTER_ARC = _arc_band(365.0, 330.0, 394.4, 311.4, 470)
INNER_ARC = _arc_band(393.0, 275.0, 418.2, 257.2, 480)
# One ear-cup, drawn by hand (egg-shaped cushion, widest low), mirrored for the other side.
_EAR_L = ("M-296 392C-228 392-178 470-176 560C-174 652-214 714-272 714"
          "C-346 714-386 642-386 548C-386 454-358 392-296 392Z")
# Mirror image, written in the same winding direction as _EAR_L so overlaps never cancel (nonzero fill).
_EAR_R = ("M296 392C358 392 386 454 386 548C386 642 346 714 272 714"
          "C214 714 174 652 176 560C178 470 228 392 296 392Z")
EARS = _EAR_L + " " + _EAR_R

# five bars, evenly spaced, pill ends; heights measured from the logo (left to right)
BAR_W = 38.0
BARS = [(-122.0, 499, 639), (-61.0, 355, 787), (0.0, 260, 816), (61.0, 502, 631), (122.0, 462, 677)]


def bars_path():
    d = []
    r = BAR_W / 2
    for cx, y0, y1 in BARS:
        x0, x1 = cx - r, cx + r
        d.append(f"M{x0:.2f} {y0 + r}A{r} {r} 0 0 1 {x1:.2f} {y0 + r}V{y1 - r}A{r} {r} 0 0 1 {x0:.2f} {y1 - r}Z")
    return "".join(d)


# One compound path: everything is the same colour, so overlaps are harmless with nonzero fill.
MARK_D = " ".join([OUTER_ARC, INNER_ARC, EARS, bars_path()])
