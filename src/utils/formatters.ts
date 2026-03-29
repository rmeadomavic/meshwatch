export function osIcon(os: string): string {
  switch (os.toLowerCase()) {
    case "windows":
      return "\u{1F5A5}";  // desktop computer
    case "linux":
      return "\u{1F427}";  // penguin
    case "macos":
    case "darwin":
    case "iOS":
      return "\u{1F34E}";  // apple
    case "android":
      return "\u{1F4F1}";  // phone
    default:
      return "\u{1F310}";  // globe
  }
}
