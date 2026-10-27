/** Maior desconto do pedido comparado à alçada do vendedor (PRD §7.5). */
export function formatDiscountVsAuthority(maxDiscount: number, authorityPercent: number): string {
  return `Maior desconto ${maxDiscount}% · alçada ${authorityPercent}%`
}
