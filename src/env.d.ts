declare namespace App {
  interface Locals {
    /** Application variant served on this host (on-demand routes only). */
    variant?: string | undefined;
    /** True when the visitor has a valid unlock cookie (on-demand routes only). */
    unlocked?: boolean;
  }
}
