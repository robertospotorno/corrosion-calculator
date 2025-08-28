import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectItem, SelectContent, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Calculator } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Corrosion Calculator (MVP)
 * • Mass composition (%) → EW (ASTM G102 approx.)
 *   EW_alloy = 1 / Σ_i [ w_i / (n_i * M_i) ], w_i in mass fraction
 * • Estimated density by rule of mixtures:
 *   ρ_mix ≈ 1 / Σ_i ( w_i / ρ_i )
 * • Given Icorr → Corrosion Rate:
 *   CR(mm/y) = 0.00327 * Icorr(μA/cm²) * EW / ρ
 */

// Minimal element database
const EL_DB: Record<string, { M: number; rho: number; nDefault: number }> = {
  Fe: { M: 55.845, rho: 7.874, nDefault: 2 },
  Cr: { M: 51.9961, rho: 7.19, nDefault: 3 },
  Ni: { M: 58.6934, rho: 8.908, nDefault: 2 },
  Mo: { M: 95.95,  rho: 10.28, nDefault: 6 },
  Cu: { M: 63.546, rho: 8.96,  nDefault: 2 },
  Sn: { M: 118.71, rho: 7.31,  nDefault: 2 },
  Ti: { M: 47.867, rho: 4.506, nDefault: 2 },
  Al: { M: 26.9815385, rho: 2.70, nDefault: 3 },
  Mg: { M: 24.305, rho: 1.738, nDefault: 2 },
  Zn: { M: 65.38,  rho: 7.14,  nDefault: 2 },
  Mn: { M: 54.938044, rho: 7.21, nDefault: 2 },
  Si: { M: 28.085, rho: 2.33,  nDefault: 4 },
  C:  { M: 12.011, rho: 2.25,  nDefault: 4 },
  N:  { M: 14.007, rho: 1.25,  nDefault: 3 },
  V:  { M: 50.9415, rho: 6.0,  nDefault: 3 },
  Co: { M: 58.933194, rho: 8.90, nDefault: 2 },
};
const EL_LIST = Object.keys(EL_DB);

type Row = {
  key: string;
  element: string | "custom";
  wtPct: number;
  n: number;
  M: number;
  rho: number;
};

function newRow(i: number): Row {
  const e = "Fe";
  return {
    key: `${Date.now()}-${i}`,
    element: e,
    wtPct: i === 0 ? 100 : 0,
    n: EL_DB[e].nDefault,
    M: EL_DB[e].M,
    rho: EL_DB[e].rho,
  };
}

export default function CorrosionCalculator() {
  const [rows, setRows] = useState<Row[]>([newRow(0), newRow(1)]);
  const [icorrValue, setIcorrValue] = useState<number>(10);
  const [icorrUnit, setIcorrUnit] = useState<"uAcm2" | "Acm2">("uAcm2");

  const totalPct = useMemo(
    () => rows.reduce((s, r) => s + (isFinite(r.wtPct) ? r.wtPct : 0), 0),
    [rows]
  );

  const massFractions = useMemo(() => {
    const t = totalPct || 1;
    return rows.map((r) => (isFinite(r.wtPct) ? Math.max(r.wtPct, 0) / t : 0));
  }, [rows, totalPct]);

  const EW = useMemo(() => {
    const denom = rows.reduce((sum, r, i) => {
      const w = massFractions[i] || 0;
      return sum + w / (Math.max(r.n, 1e-12) * Math.max(r.M, 1e-12));
    }, 0);
    return denom > 0 ? 1 / denom : NaN;
  }, [rows, massFractions]);

  const rhoMix = useMemo(() => {
    const denom = rows.reduce((sum, r, i) => {
      const w = massFractions[i] || 0;
      return sum + w / Math.max(r.rho, 1e-12);
    }, 0);
    return denom > 0 ? 1 / denom : NaN;
  }, [rows, massFractions]);

  const icorr_uAcm2 = useMemo(
    () => (icorrUnit === "uAcm2" ? icorrValue : icorrValue * 1e6),
    [icorrValue, icorrUnit]
  );

  const CR_mm_per_y = useMemo(() => {
    if (!isFinite(EW) || !isFinite(rhoMix) || !isFinite(icorr_uAcm2)) return NaN;
    return 0.00327 * icorr_uAcm2 * EW / rhoMix;
  }, [icorr_uAcm2, EW, rhoMix]);

  const CR_um_per_y = useMemo(() => (isFinite(CR_mm_per_y) ? CR_mm_per_y * 1000 : NaN), [CR_mm_per_y]);
  const CR_mpy      = useMemo(() => (isFinite(CR_mm_per_y) ? CR_mm_per_y / 0.0254 : NaN), [CR_mm_per_y]);

  function updateRow(idx: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }
  function onElementChange(idx: number, value: string) {
    if (value === "custom") {
      updateRow(idx, { element: "custom" });
    } else {
      const info = EL_DB[value];
      updateRow(idx, { element: value, n: info.nDefault, M: info.M, rho: info.rho });
    }
  }
  function addRow() { setRows((r) => [...r, newRow(r.length)]); }
  function removeRow(idx: number) { setRows((r) => (r.length > 1 ? r.filter((_, i) => i !== idx) : r)); }
  function normalizeTo100() {
    const t = totalPct || 1;
    setRows((r) => r.map((row) => ({ ...row, wtPct: (row.wtPct / t) * 100 })));
  }
  function evenSplit() {
    const n = rows.length;
    setRows((r) => r.map((row) => ({ ...row, wtPct: 100 / n })));
  }

  const pctBadge = (
    <span className={`text-xs px-2 py-1 rounded-full ${Math.abs(totalPct - 100) < 1e-6 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
      Sum % = {totalPct.toFixed(3)}{Math.abs(totalPct - 100) < 1e-6 ? " (OK)" : " (normalize)"}
    </span>
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-white p-6">
      <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-semibold mb-4">
        Alloy Equivalent Weight & Corrosion Rate Calculator
      </motion.h1>

      <div className="flex flex-col gap-6 max-w-5xl">
        {/* Composition */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium">Mass composition (%)</div>
              <div className="flex items-center gap-2">
                {pctBadge}
                <Button variant="secondary" onClick={normalizeTo100} title="Scale percentages to sum to 100%">Normalize</Button>
                <Button variant="secondary" onClick={evenSplit} title="Split evenly">Even split</Button>
                <Button onClick={addRow} className="gap-2"><Plus className="w-4 h-4" />Add element</Button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 text-sm font-medium px-2 pb-1 text-slate-600">
              <div className="col-span-3">Element</div>
              <div className="col-span-2">wt%</div>
              <div className="col-span-2">n (valence)</div>
              <div className="col-span-2">M (g/mol)</div>
              <div className="col-span-2">ρ (g/cm³)</div>
              <div className="col-span-1 text-right"> </div>
            </div>

            {rows.map((r, idx) => (
              <div key={r.key} className="grid grid-cols-12 gap-2 items-center py-1 border-b border-slate-200">
                <div className="col-span-3">
                  <Select value={r.element} onValueChange={(v) => onElementChange(idx, v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Element" /></SelectTrigger>
                    <SelectContent>
                      {EL_LIST.map((el) => (
                        <SelectItem key={el} value={el}>{el}</SelectItem>
                      ))}
                      <SelectItem value="custom">Custom…</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Input type="number" step="0.001" value={r.wtPct} onChange={(e) => updateRow(idx, { wtPct: Number(e.target.value) })} />
                </div>
                <div className="col-span-2">
                  <Input type="number" step="1" value={r.n} onChange={(e) => updateRow(idx, { n: Number(e.target.value) })} />
                </div>
                <div className="col-span-2">
                  <Input type="number" step="0.0001" value={r.M} onChange={(e) => updateRow(idx, { M: Number(e.target.value) })} />
                </div>
                <div className="col-span-2">
                  <Input type="number" step="0.0001" value={r.rho} onChange={(e) => updateRow(idx, { rho: Number(e.target.value) })} />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button variant="ghost" onClick={() => removeRow(idx)} title="Remove row"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}

            <div className="text-xs text-slate-500 mt-2">
              Tip: set <em>n</em> to the oxidation charge (e.g., Fe→Fe²⁺ ⇒ n=2; Cr→Cr³⁺ ⇒ n=3).
            </div>
          </CardContent>
        </Card>

        {/* Icorr */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="font-medium mb-3">Corrosion current</div>
            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-6 md:col-span-4">
                <label className="text-sm text-slate-600">I<sub>corr</sub> value</label>
                <Input type="number" step="0.0001" value={icorrValue} onChange={(e) => setIcorrValue(Number(e.target.value))} />
              </div>
              <div className="col-span-6 md:col-span-3">
                <label className="text-sm text-slate-600">Units</label>
                <Select value={icorrUnit} onValueChange={(v: any) => setIcorrUnit(v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uAcm2">μA/cm²</SelectItem>
                    <SelectItem value="Acm2">A/cm²</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-12 md:col-span-5 flex items-end justify-end">
                <Button className="gap-2"><Calculator className="w-4 h-4" />Calculate</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-slate-50 border">
                <div className="text-xs uppercase tracking-wide text-slate-500">Equivalent Weight (EW)</div>
                <div className="text-2xl font-semibold">
                  {isFinite(EW) ? EW.toFixed(4) : "–"} <span className="text-base font-normal">g/equiv</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">ASTM G102: EW = 1 / Σ (w / (n·M))</div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-slate-50 border">
                <div className="text-xs uppercase tracking-wide text-slate-500">Estimated density</div>
                <div className="text-2xl font-semibold">
                  {isFinite(rhoMix) ? rhoMix.toFixed(4) : "–"} <span className="text-base font-normal">g/cm³</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">Rule of mixtures: ρ ≈ 1 / Σ (w / ρ)</div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-slate-50 border">
                <div className="text-xs uppercase tracking-wide text-slate-500">Corrosion rate</div>
                <div className="text-2xl font-semibold">
                  {isFinite(CR_mm_per_y) ? CR_mm_per_y.toFixed(4) : "–"} <span className="text-base font-normal">mm/y</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Also: {isFinite(CR_um_per_y) ? CR_um_per_y.toFixed(1) : "–"} μm/y · {isFinite(CR_mpy) ? CR_mpy.toFixed(3) : "–"} mpy
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  CR = 0.00327 · I<sub>corr</sub>(μA/cm²) · EW / ρ
                </div>
              </motion.div>
            </div>

            <div className="text-[11px] text-slate-500 mt-3 leading-relaxed">
              <strong>Note:</strong> If the percentage sum ≠ 100, use "Normalize". For alloys where selective dissolution behavior is known, customize <em>n</em> for each element.
            </div>
          </CardContent>
        </Card>

        {/* Citation + footer */}
        <div className="text-xs text-slate-500">
          Please cite the following article, which applies EW and average density to estimate corrosion rate:{" "}
          <a
            href="https://doi.org/10.1002/maco.202314227"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            DOI: 10.1002/maco.202314227
          </a>.
        </div>
        <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
          R. Spotorno et al;
          <em> Corrosion Behavior of Two Cu-Based Shape Memory Alloys in NaCl Solution: An Electrochemical Study</em>.
          <strong> Materials and Corrosion</strong> 2024, <strong>75</strong> (9), 1155–1172.
          <a href="https://doi.org/10.1002/maco.202314227" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline"> https://doi.org/10.1002/maco.202314227</a>.
        </div>
        <div className="text-xs text-slate-500 mt-2">
          © {new Date().getFullYear()} – Educational/research MVP. Validate on known cases before decision-making use.
        </div>
      </div>
    </div>
  );
}
