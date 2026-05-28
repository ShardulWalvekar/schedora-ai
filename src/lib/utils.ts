import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateMeetingLink(provider: string, seed: string): string {
  const cleanId = seed.substring(0, 8);
  switch (provider) {
    case "Zoom":
      return `https://zoom.us/j/89922460228?pwd=gHEZJ_${cleanId}`;
    case "Google Meet":
      return `https://meet.google.com/pgv-eqop-${cleanId}`;
    case "Microsoft Teams":
      return `https://teams.microsoft.com/l/meetup-join/19%3ameeting_${cleanId}`;
    default:
      return `https://meet.google.com/pgv-eqop-${cleanId}`;
  }
}
