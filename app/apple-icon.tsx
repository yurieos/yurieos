import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180
}
export const contentType = 'image/png'

export default async function AppleIcon() {
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
        background: '#1c1917',
        borderRadius: 32
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={emojiUrl}
        alt=""
        width={140}
        height={140}
        style={{ objectFit: 'contain' }}
      />
    </div>,
    {
      ...size
    }
  )
}
