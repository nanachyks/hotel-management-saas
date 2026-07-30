import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../api/client';
import { currencySymbols } from '../styles';

interface Currency {
  code: string; name: string; symbol: string;
}
interface ExchangeRate {
  from_currency: string; to_currency: string; rate: number;
}

interface CurrencyContextType {
  currencies: Currency[];
  displayCurrency: string;
  setDisplayCurrency: (code: string) => void;
  convert: (amount: number, from?: string) => number;
  f: (amount: number) => string;
}

const defaultContext: CurrencyContextType = {
  currencies: [], displayCurrency: 'GHS',
  setDisplayCurrency: () => {},
  convert: (a: number) => a,
  f: (a: number) => `GHS ${a.toFixed(2)}`,
};
const CurrencyContext = createContext<CurrencyContextType>(defaultContext);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [displayCurrency, setDisplayCurrencyState] = useState(() => localStorage.getItem('displayCurrency') || 'GHS');

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api.get<Currency[]>('/currencies').then(setCurrencies).catch(() => {});
    api.get<ExchangeRate[]>('/currencies/rates').then(data => {
      const map: Record<string, number> = {};
      for (const r of data) map[`${r.from_currency}->${r.to_currency}`] = r.rate;
      setRates(map);
    }).catch(() => {});
  }, []);

  const setDisplayCurrency = (code: string) => {
    setDisplayCurrencyState(code);
    localStorage.setItem('displayCurrency', code);
  };

  const convert = (amount: number, from?: string): number => {
    const key = `${from || 'GHS'}->${displayCurrency}`;
    return amount * (rates[key] || 1);
  };

  const f = (amount: number): string => {
    const sym = currencySymbols[displayCurrency] || displayCurrency;
    return `${sym} ${amount.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currencies, displayCurrency, setDisplayCurrency, convert, f }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
