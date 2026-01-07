import { generateId } from 'ai'

import { Chat } from '@/components/chat'

export default async function Page() {
  const id = generateId()
  return <Chat key={id} id={id} />
}
