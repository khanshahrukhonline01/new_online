import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RouterProvider } from './RouterContext'
import { useRouter } from './useRouter'

function Probe() {
  const { path, queryParams } = useRouter()
  return (
    <div data-path={path} data-tab={queryParams.get('tab') || ''}>
      {path}
    </div>
  )
}

describe('RouterContext & useRouter', () => {
  it('provides router context cleanly in SSR and degrades safely outside provider', () => {
    const insideHtml = renderToStaticMarkup(
      <RouterProvider>
        <Probe />
      </RouterProvider>,
    )
    expect(insideHtml).toContain('data-path="/"')

    const standaloneHtml = renderToStaticMarkup(<Probe />)
    expect(standaloneHtml).toContain('data-path="/"')
  })
})
