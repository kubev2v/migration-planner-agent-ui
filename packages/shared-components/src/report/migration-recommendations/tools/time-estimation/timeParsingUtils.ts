export interface ParsedAssumption {
  workload?: string;
  resources?: string;
  schedule?: string;
  volume?: string;
  transferSpeed?: string;
  transferRate?: string;
  assumption?: string;
}

export const parsePostMigrationChecks = (reason: string): ParsedAssumption => {
  const assumptions: ParsedAssumption = {};

  const vmsMatch = reason.match(
    /(\d+)\s+VMs?\s+@\s+([\d.]+)\s+mins?(?:\/|\s+)each/i,
  );
  if (vmsMatch) {
    assumptions.workload = `${vmsMatch[1]} VMs at ${vmsMatch[2]} mins/each`;
  }

  const engineersMatch = reason.match(
    /(\d+(?:\.\d+)?)\s+engineers?\s+working\s+(\d+(?:\.\d+)?)[-\s]h(?:our)?(?:\/day|\s+shifts?)/i,
  );
  if (engineersMatch) {
    assumptions.resources = `${engineersMatch[1]} Engineers working ${engineersMatch[2]}-hour shifts`;
  }

  const daysMatch = reason.match(/(\d+)\s+(?:work|business)\s+days/i);
  if (daysMatch) {
    assumptions.schedule = `${daysMatch[1]} Business Days total`;
  }

  return assumptions;
};

export const parseStorageTransfer = (reason: string): ParsedAssumption => {
  const assumptions: ParsedAssumption = {};

  const volumeMatch = reason.match(/([\d,]+\.?\d*)\s+GB(?!\/)/i);
  if (volumeMatch) {
    const gb = parseFloat(volumeMatch[1].replace(/,/g, ""));
    assumptions.volume = `${gb.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GB`;
  }

  const fullSpeedMatch = reason.match(
    /(\d+(?:\.\d+)?)\s+Mbps\s*\((\d+(?:\.\d+)?)\s+min\/(\d+(?:\.\d+)?)GB\)/i,
  );
  if (fullSpeedMatch) {
    assumptions.transferSpeed = `${fullSpeedMatch[1]} Mbps (${fullSpeedMatch[2]} min/${fullSpeedMatch[3]}GB)`;
  } else {
    const speedMatch = reason.match(/\((\d+)\s+min\/(\d+)GB\)/i);
    if (speedMatch) {
      assumptions.transferSpeed = `~${speedMatch[1]} minutes per ${speedMatch[2]}GB`;
    }
  }

  return assumptions;
};

export const parseStorageOffload = (reason: string): ParsedAssumption => {
  const assumptions: ParsedAssumption = {};

  const volumeMatch = reason.match(/([\d,]+\.?\d*)\s+GB(?!\/)/i);
  if (volumeMatch) {
    const gb = parseFloat(volumeMatch[1].replace(/,/g, ""));
    assumptions.volume = `${gb.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GB`;
  }

  const rateMatch = reason.match(
    /([\d.]+)\s*[–-]\s*([\d.]+)\s+GB\/s\s+transfer\s+rate/i,
  );
  if (rateMatch) {
    assumptions.transferRate = `${rateMatch[1]} \u2013 ${rateMatch[2]} GB/s transfer rate`;
  }

  const assumptionMatch = reason.match(/;\s*(assumes?\s+.+)/i);
  if (assumptionMatch) {
    const text = assumptionMatch[1].trim();
    assumptions.assumption = text.charAt(0).toUpperCase() + text.slice(1);
  }

  return assumptions;
};
