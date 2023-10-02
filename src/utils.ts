export const AUDollarFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "AUD",
});

export const sortByDateDescending = (a: string, b: string) =>
  new Date(b).getTime() - new Date(a).getTime();
