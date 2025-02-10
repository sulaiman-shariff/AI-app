import { createContext, useEffect, useState } from "react";

export type ApiKeyContextType = {
    apiKey: string | undefined;
    setApiKey: (apiKey: string) => void;
    };

export const ApiKeyContext = createContext<ApiKeyContextType>({"apiKey": undefined, "setApiKey": (apiKey: string) => {}});

export const ApiKeyContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [apiKey, setApiKey] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    const apiKey = sessionStorage.getItem("apiKey");
    if (apiKey) {
      setApiKey(apiKey);
    }  
  }, []);

  return <ApiKeyContext.Provider value={{
    apiKey,
    setApiKey
  }}>{children}</ApiKeyContext.Provider>;
};


