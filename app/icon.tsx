import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32
}
export const contentType = 'image/png'

export default async function Icon() {
  // Use Apple's teddy bear emoji from CDN
  const emojiUrl =
    'https://em-content.zobj.net/source/apple/391/teddy-bear_1f9f8.png'

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent'
      }}
    >
      { }
      <img
        src={emojiUrl}
        alt=""
        width={28}
        height={28}
        style={{ objectFit: 'contain' }}
      />
    </div>,
    {
      ...size
    }
  )
}
