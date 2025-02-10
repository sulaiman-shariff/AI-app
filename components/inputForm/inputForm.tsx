"use-client"

import { Fieldset, TextInput, PasswordInput, Button, Group } from '@mantine/core';
import { IconUser, IconChevronRight, IconId } from '@tabler/icons-react';

import { useContext, useState } from 'react';

import { useRouter } from 'next/navigation'
import { ApiKeyContext } from '../ApiKeyContextProvider';

function doStuff(n:string | undefined,u:string | undefined ,a:string | undefined , router:any) {
  if (a) sessionStorage.setItem("apiKey", a)
  if (n) localStorage.setItem('name', n)
  if(!n || !u || !a){
    alert("Empty Fields")
  }
  else {
  // API CALL
  console.log(n , u,a)
  router.push("/dashboard")
  }

}

export function Field() {
    const [name , setname] = useState<string>();
    const [USN , setUSN] = useState<string>();
    const router = useRouter()

    const {apiKey, setApiKey} = useContext(ApiKeyContext);

  return (
    <Fieldset legend="Basic information">
      <TextInput withAsterisk label="Your name" placeholder="Your name" rightSection={<IconUser  size={14} />} onChange={(e)=>{setname(e.target.value)}} />
      <TextInput withAsterisk label="USN" placeholder="xxxxxxxxx" mt="md" rightSection={<IconId  size={14} />} onChange={(e)=>{setUSN(e.target.value)}} />
      <PasswordInput withAsterisk label="API key" placeholder="Gemeini Key" mt="md" onChange={(e)=>{setApiKey(e.target.value)}} />
        
        
        <Button fullWidth mt='lg' justify="center"  rightSection={<IconChevronRight size={16} />} onClick={() => {doStuff(name,USN, apiKey, router)}}>Next</Button>
    </Fieldset>
  );
}

