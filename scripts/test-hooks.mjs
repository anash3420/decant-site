// Lets `node --test` load client code that imports '@shared/…' (the alias Vite resolves for the app)
import { registerHooks } from 'node:module'

const shared = new URL('../shared/', import.meta.url)

registerHooks({
  resolve: (specifier, context, next) =>
    next(
      specifier.startsWith('@shared/') ? new URL(specifier.slice('@shared/'.length), shared).href : specifier,
      context,
    ),
})
