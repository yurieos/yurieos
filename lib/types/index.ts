import { JSONValue, ModelMessage } from 'ai'

export type SearchResults = {
  images: SearchResultImage[]
  results: SearchResultItem[]
  number_of_results?: number
  query: string
}

// If enabled the include_images_description is true, the images will be an array of { url: string, description: string }
// Otherwise, the images will be an array of strings
export type SearchResultImage =
  | string
  | {
      url: string
      description: string
      number_of_results?: number
    }

export type SearchResultItem = {
  title: string
  url: string
  content: string
}

export interface Chat extends Record<string, any> {
  id: string
  title: string
  createdAt: Date
  userId: string
  path: string
  messages: ExtendedCoreMessage[] // Note: Changed from AIMessage to ExtendedCoreMessage
}

// ExtendedCoreMessage for saving annotations
export type ExtendedCoreMessage = Omit<ModelMessage, 'role' | 'content'> & {
  role: ModelMessage['role'] | 'data'
  content: ModelMessage['content'] | JSONValue
}
