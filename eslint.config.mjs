import nextConfig from 'eslint-config-next'
import simpleImportSort from 'eslint-plugin-simple-import-sort'

const eslintConfig = [
  ...nextConfig,
  {
    plugins: {
      'simple-import-sort': simpleImportSort
    },
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // React and Next.js imports
            ['^react', '^next'],
            // Third party imports
            ['^@?\\w'],
            // Internal imports
            ['^@/types'],
            ['^@/config'],
            ['^@/lib'],
            ['^@/hooks'],
            ['^@/components/ui'],
            ['^@/components'],
            ['^@/registry'],
            ['^@/styles'],
            ['^@/app'],
            // Side effect imports
            ['^\\u0000'],
            // Parent imports
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            // Other relative imports
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            // Style imports
            ['^.+\\.s?css$']
          ]
        }
      ],
      'simple-import-sort/exports': 'error'
    }
  }
]

export default eslintConfig
