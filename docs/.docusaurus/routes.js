import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '5ff'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', '5ba'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', 'a2b'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', 'c3c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '156'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', '88c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '000'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', '497'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '170'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '215'),
            routes: [
              {
                path: '/docs/explorer',
                component: ComponentCreator('/docs/explorer', '483'),
                exact: true,
                sidebar: "docSidebar"
              },
              {
                path: '/docs/introduction',
                component: ComponentCreator('/docs/introduction', 'ca5'),
                exact: true,
                sidebar: "docSidebar"
              },
              {
                path: '/docs/operators/configuration',
                component: ComponentCreator('/docs/operators/configuration', '97c'),
                exact: true,
                sidebar: "docSidebar"
              },
              {
                path: '/docs/operators/monitoring',
                component: ComponentCreator('/docs/operators/monitoring', 'dae'),
                exact: true,
                sidebar: "docSidebar"
              },
              {
                path: '/docs/operators/overview',
                component: ComponentCreator('/docs/operators/overview', 'e11'),
                exact: true,
                sidebar: "docSidebar"
              },
              {
                path: '/docs/operators/troubleshooting',
                component: ComponentCreator('/docs/operators/troubleshooting', '69f'),
                exact: true,
                sidebar: "docSidebar"
              },
              {
                path: '/docs/protocol/consensus',
                component: ComponentCreator('/docs/protocol/consensus', 'baa'),
                exact: true,
                sidebar: "docSidebar"
              },
              {
                path: '/docs/protocol/overview',
                component: ComponentCreator('/docs/protocol/overview', '2ad'),
                exact: true,
                sidebar: "docSidebar"
              },
              {
                path: '/docs/protocol/parameters',
                component: ComponentCreator('/docs/protocol/parameters', '17f'),
                exact: true
              },
              {
                path: '/docs/protocol/rewards',
                component: ComponentCreator('/docs/protocol/rewards', '0a2'),
                exact: true,
                sidebar: "docSidebar"
              },
              {
                path: '/docs/protocol/staking',
                component: ComponentCreator('/docs/protocol/staking', '7d1'),
                exact: true,
                sidebar: "docSidebar"
              },
              {
                path: '/docs/protocol/validators',
                component: ComponentCreator('/docs/protocol/validators', '3ae'),
                exact: true,
                sidebar: "docSidebar"
              },
              {
                path: '/docs/reference/faq',
                component: ComponentCreator('/docs/reference/faq', 'b05'),
                exact: true,
                sidebar: "docSidebar"
              },
              {
                path: '/docs/reference/glossary',
                component: ComponentCreator('/docs/reference/glossary', '3ed'),
                exact: true,
                sidebar: "docSidebar"
              },
              {
                path: '/docs/roadmap',
                component: ComponentCreator('/docs/roadmap', '0ab'),
                exact: true,
                sidebar: "docSidebar"
              },
              {
                path: '/docs/security/audits',
                component: ComponentCreator('/docs/security/audits', '971'),
                exact: true,
                sidebar: "docSidebar"
              },
              {
                path: '/docs/security/threat_model',
                component: ComponentCreator('/docs/security/threat_model', '872'),
                exact: true,
                sidebar: "docSidebar"
              },
              {
                path: '/docs/use_cases',
                component: ComponentCreator('/docs/use_cases', 'ee7'),
                exact: true,
                sidebar: "docSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', 'e5f'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
