// Deja solo dígitos y corta a 8, como exige el PIN maestro.
export const onlyPinDigits = (value: string) => value.replace(/\D/g, '').slice(0, 8);
