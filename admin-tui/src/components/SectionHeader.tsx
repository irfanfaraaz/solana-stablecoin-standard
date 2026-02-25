import React from "react";
import { Text } from "ink";

const WIDTH = 52;

export function SectionHeader({ title }: { title: string }) {
  const dashLen = Math.max(0, WIDTH - title.length - 2);
  const left = Math.floor(dashLen / 2);
  const right = dashLen - left;
  const line = "─".repeat(left) + " " + title + " " + "─".repeat(right);
  return <Text dimColor>{line}</Text>;
}
