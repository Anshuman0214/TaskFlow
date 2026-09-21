import type { HTMLAttributes } from "react";

export const Card = ({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`} {...rest} />
);
