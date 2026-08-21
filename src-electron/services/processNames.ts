const friendlyNames = new Map<string, string>([
  ["chrome.exe", "Google Chrome"],
  ["chrome", "Google Chrome"],
  ["msedge.exe", "Microsoft Edge"],
  ["msedge", "Microsoft Edge"],
  ["firefox.exe", "Mozilla Firefox"],
  ["firefox", "Mozilla Firefox"],
  ["discord.exe", "Discord"],
  ["discord", "Discord"],
  ["explorer.exe", "Windows Explorer"],
  ["explorer", "Windows Explorer"],
  ["dwm.exe", "Desktop Window Manager"],
  ["dwm", "Desktop Window Manager"],
  ["msmpeng.exe", "Microsoft Defender Antivirus"],
  ["msmpeng", "Microsoft Defender Antivirus"],
  ["code.exe", "Visual Studio Code"],
  ["code", "Visual Studio Code"],
  ["teams.exe", "Microsoft Teams"],
  ["teams", "Microsoft Teams"],
  ["msteams.exe", "Microsoft Teams"],
  ["msteams", "Microsoft Teams"],
  ["onedrive.exe", "Microsoft OneDrive"],
  ["onedrive", "Microsoft OneDrive"],
  ["steam.exe", "Steam"],
  ["steam", "Steam"],
]);

export function normalizedProcessKey(name: string): string {
  return name.trim().toLowerCase();
}

export function friendlyProcessName(name: string): string {
  const normalized = normalizedProcessKey(name);
  const knownName = friendlyNames.get(normalized);

  if (knownName) {
    return knownName;
  }

  const withoutExtension = normalized.endsWith(".exe")
    ? normalized.slice(0, -".exe".length)
    : normalized;

  if (!withoutExtension) {
    return "Aplicativo nao identificado";
  }

  return withoutExtension
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
