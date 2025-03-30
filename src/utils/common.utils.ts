export const getKeys = <T extends object>(obj: T) => Object.keys(obj) as Array<keyof T>;

export const formatPriceNumberToFrenchFormatStr = (number: number) => {
    return number.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    });
  };