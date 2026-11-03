// The same four languages as i18n/lang.ts. Declared here so the build script (vite.config.ts) can import this file alone.
type UiLang = 'pt' | 'en' | 'fr' | 'es'
type ByLang<T = string> = Record<UiLang, T>

/**
 * The text pages that need no data from the API: privacy policy, terms of use, contact and the reading guide.
 *
 * They live here, as plain data, so that the page the visitor sees (pages/InfoPage.tsx) and the HTML the build writes
 * into each route's file for crawlers (the seoPages plugin in vite.config.ts) come from one text. Every language is
 * written out in full; nothing falls back to another language.
 */

export type InfoPageId = 'privacy' | 'terms' | 'contact' | 'guide'

export interface InfoLink {
  label: string
  href: string
}

export interface InfoSection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
  links?: InfoLink[]
}

export interface InfoPage {
  eyebrow: string
  title: string
  intro: string
  sections: InfoSection[]
}

export const INFO_PATHS: Record<InfoPageId, string> = {
  privacy: '/privacy',
  terms: '/terms',
  contact: '/contact',
  guide: '/guide',
}

/** The day the privacy policy and the terms were last changed. */
export const INFO_UPDATED = '2026-11-01'

const UPDATED_LABEL: ByLang = {
  pt: 'Última atualização: 1 de novembro de 2026',
  en: 'Last updated: November 1, 2026',
  fr: 'Dernière mise à jour : 1er novembre 2026',
  es: 'Última actualización: 1 de noviembre de 2026',
}

/** The public address of the site; VITE_CONTACT_EMAIL (set on Vercel) overrides it at build time. */
export const CONTACT_EMAIL = 'vektormma@gmail.com'

export const GITHUB_REPOSITORY = 'https://github.com/larissapavan/vektormma'

const CHANNELS: InfoLink[] = [
  { label: 'GitHub', href: GITHUB_REPOSITORY },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/larissacpavan/' },
  { label: 'Instagram: @vektormma', href: 'https://www.instagram.com/vektormma' },
  { label: 'YouTube: @Vektor-MMA', href: 'https://www.youtube.com/@Vektor-MMA' },
  { label: 'TikTok: @vektormma', href: 'https://www.tiktok.com/@vektormma' },
]

const GOOGLE_LINKS: ByLang<InfoLink[]> = {
  pt: [
    { label: 'Como o Google usa informações de sites e apps que usam seus serviços', href: 'https://policies.google.com/technologies/partner-sites?hl=pt-BR' },
    { label: 'Configurações de anúncios do Google', href: 'https://adssettings.google.com' },
    { label: 'Opções de publicidade (aboutads.info)', href: 'https://www.aboutads.info/choices/' },
  ],
  en: [
    { label: 'How Google uses information from sites or apps that use its services', href: 'https://policies.google.com/technologies/partner-sites?hl=en' },
    { label: 'Google Ads Settings', href: 'https://adssettings.google.com' },
    { label: 'Advertising choices (aboutads.info)', href: 'https://www.aboutads.info/choices/' },
  ],
  fr: [
    { label: 'Comment Google utilise les informations des sites et applications qui utilisent ses services', href: 'https://policies.google.com/technologies/partner-sites?hl=fr' },
    { label: 'Paramètres des annonces Google', href: 'https://adssettings.google.com' },
    { label: 'Choix en matière de publicité (youronlinechoices.eu)', href: 'https://www.youronlinechoices.eu/' },
  ],
  es: [
    { label: 'Cómo usa Google la información de sitios y apps que usan sus servicios', href: 'https://policies.google.com/technologies/partner-sites?hl=es-419' },
    { label: 'Configuración de anuncios de Google', href: 'https://adssettings.google.com' },
    { label: 'Opciones de publicidad (aboutads.info)', href: 'https://www.aboutads.info/choices/' },
  ],
}

const PRIVACY: ByLang<InfoPage> = {
  pt: {
    eyebrow: 'Transparência',
    title: 'Política de Privacidade',
    intro: 'Esta página explica, sem rodeios, quais informações o Vektor MMA recebe quando você o visita, para que servem e o que você pode fazer a respeito.',
    sections: [
      {
        heading: 'Quem é o responsável',
        paragraphs: [
          'O Vektor MMA (vektormma.com) é um projeto pessoal e independente de Larissa Pavan, no Brasil. Não há empresa por trás, equipe de vendas nem venda de dados. Para qualquer assunto sobre privacidade, use a página de contato.',
        ],
      },
      {
        heading: 'Quais dados o site coleta',
        paragraphs: [
          'O site não tem cadastro, login, comentários nem formulários. Eu não peço nome, e-mail, telefone ou qualquer dado pessoal, e não os guardo.',
          'Ao usar o simulador, os nomes dos dois lutadores escolhidos são enviados à API para calcular a previsão. Esses nomes não ficam ligados a você.',
          'Como em qualquer site, os servidores de hospedagem (Vercel, para as páginas, e Railway, para a API) registram dados técnicos de cada acesso, como endereço IP, data e hora, página pedida e navegador. Esses registros servem para segurança, para limitar abusos e para manter o serviço no ar.',
        ],
      },
      {
        heading: 'O que fica no seu navegador',
        paragraphs: [
          'O site guarda no armazenamento local do seu navegador apenas preferências suas: o tema (claro ou escuro) e o idioma escolhido. Elas não são enviadas a nenhum servidor e você pode apagá-las limpando os dados do site no navegador.',
        ],
      },
      {
        heading: 'Estatísticas de uso',
        paragraphs: [
          'Para saber quais páginas são lidas, uso o Vercel Web Analytics. Ele não usa cookies, não cria perfil de visitante nem acompanha você em outros sites. Recebo apenas números agregados: páginas vistas, origem da visita, país, tipo de dispositivo e de navegador.',
        ],
      },
      {
        heading: 'Anúncios e o Google AdSense',
        paragraphs: [
          'O site pode exibir anúncios do Google AdSense. O Google e seus parceiros usam cookies e identificadores semelhantes para exibir e medir anúncios e, quando permitido, para personalizá-los com base em suas visitas a este e a outros sites. Eu não recebo esses dados e não controlo quais anúncios aparecem.',
          'Na União Europeia, no Reino Unido e na Suíça, os anúncios dependem do seu consentimento, pedido por uma mensagem do Google. Você pode mudar a escolha a qualquer momento e também desativar a personalização de anúncios nos links abaixo.',
        ],
        links: GOOGLE_LINKS.pt,
      },
      {
        heading: 'Outros serviços de terceiros',
        bullets: [
          'Google Fonts: as fontes do site são carregadas dos servidores do Google, que por isso recebem seu endereço IP.',
          'Vercel e Railway: hospedam o site e a API e têm suas próprias políticas de privacidade.',
          'Links externos (ESPN, UFC.com, redes sociais e outros): ao clicar, você sai do Vektor MMA e passa a seguir as regras de cada um deles.',
        ],
      },
      {
        heading: 'Seus direitos',
        paragraphs: [
          'Pela Lei Geral de Proteção de Dados (LGPD) e, para quem está na Europa, pelo GDPR, você pode pedir acesso, correção ou exclusão de dados pessoais, retirar o consentimento e se opor ao tratamento. Como o site não guarda dados que identifiquem você, esses pedidos dizem respeito, na prática, ao que os serviços de terceiros acima mantêm. Se quiser exercer qualquer direito, escreva pela página de contato.',
        ],
      },
      {
        heading: 'Crianças',
        paragraphs: ['O site não é dirigido a menores de 13 anos e não coleta dados de crianças de propósito.'],
      },
      {
        heading: 'Mudanças nesta política',
        paragraphs: ['Se o site passar a usar um serviço novo que mude o que está escrito aqui, esta página será atualizada e a data no topo será trocada.'],
      },
    ],
  },
  en: {
    eyebrow: 'Transparency',
    title: 'Privacy Policy',
    intro: 'This page explains plainly what information Vektor MMA receives when you visit, what it is for and what you can do about it.',
    sections: [
      {
        heading: 'Who is responsible',
        paragraphs: [
          'Vektor MMA (vektormma.com) is an independent personal project by Larissa Pavan, in Brazil. There is no company behind it, no sales team and no sale of data. For anything about privacy, use the contact page.',
        ],
      },
      {
        heading: 'What data the site collects',
        paragraphs: [
          'The site has no sign-up, login, comments or forms. I do not ask for your name, email, phone number or any other personal data, and I do not keep any.',
          'When you use the predictor, the names of the two fighters you picked are sent to the API to work out the prediction. Those names are not linked to you.',
          'As with any website, the hosting servers (Vercel for the pages, Railway for the API) record technical details of each visit, such as IP address, date and time, the page requested and the browser. These logs are used for security, to limit abuse and to keep the service running.',
        ],
      },
      {
        heading: 'What stays in your browser',
        paragraphs: [
          'The site keeps only your preferences in your browser’s local storage: the theme (light or dark) and the language you chose. They are not sent to any server, and you can erase them by clearing the site’s data in your browser.',
        ],
      },
      {
        heading: 'Usage statistics',
        paragraphs: [
          'To learn which pages are read, I use Vercel Web Analytics. It uses no cookies, builds no visitor profile and does not follow you across other sites. I only get aggregate numbers: page views, where the visit came from, country, and the type of device and browser.',
        ],
      },
      {
        heading: 'Ads and Google AdSense',
        paragraphs: [
          'The site may show ads from Google AdSense. Google and its partners use cookies and similar identifiers to show and measure ads and, where allowed, to personalize them based on your visits to this and other sites. I do not receive that data and I do not control which ads appear.',
          'In the European Union, the United Kingdom and Switzerland, ads depend on your consent, requested through a message from Google. You can change your choice at any time, and you can also turn off ad personalization with the links below.',
        ],
        links: GOOGLE_LINKS.en,
      },
      {
        heading: 'Other third-party services',
        bullets: [
          'Google Fonts: the site’s fonts are loaded from Google’s servers, which therefore receive your IP address.',
          'Vercel and Railway: they host the site and the API and have their own privacy policies.',
          'External links (ESPN, UFC.com, social networks and others): when you click, you leave Vektor MMA and follow each one’s own rules.',
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          'Under Brazil’s General Data Protection Law (LGPD) and, if you are in Europe, the GDPR, you can ask for access to, correction or deletion of personal data, withdraw consent and object to processing. Because the site keeps no data that identifies you, these requests in practice concern what the third-party services above hold. To exercise any right, write through the contact page.',
        ],
      },
      {
        heading: 'Children',
        paragraphs: ['The site is not aimed at children under 13 and does not knowingly collect data from children.'],
      },
      {
        heading: 'Changes to this policy',
        paragraphs: ['If the site starts using a new service that changes what is written here, this page will be updated and the date at the top will change.'],
      },
    ],
  },
  fr: {
    eyebrow: 'Transparence',
    title: 'Politique de confidentialité',
    intro: 'Cette page explique simplement quelles informations Vektor MMA reçoit lorsque vous le visitez, à quoi elles servent et ce que vous pouvez en faire.',
    sections: [
      {
        heading: 'Qui est responsable',
        paragraphs: [
          'Vektor MMA (vektormma.com) est un projet personnel et indépendant de Larissa Pavan, au Brésil. Il n’y a ni société derrière, ni équipe commerciale, ni vente de données. Pour toute question de confidentialité, utilisez la page de contact.',
        ],
      },
      {
        heading: 'Quelles données le site collecte',
        paragraphs: [
          'Le site n’a ni inscription, ni connexion, ni commentaires, ni formulaires. Je ne demande ni nom, ni e-mail, ni téléphone, ni aucune autre donnée personnelle, et je n’en conserve aucune.',
          'Lorsque vous utilisez le simulateur, les noms des deux combattants choisis sont envoyés à l’API pour calculer la prévision. Ces noms ne sont pas liés à vous.',
          'Comme tout site, les serveurs d’hébergement (Vercel pour les pages, Railway pour l’API) enregistrent des informations techniques sur chaque visite : adresse IP, date et heure, page demandée et navigateur. Ces journaux servent à la sécurité, à limiter les abus et à maintenir le service en ligne.',
        ],
      },
      {
        heading: 'Ce qui reste dans votre navigateur',
        paragraphs: [
          'Le site ne conserve dans le stockage local de votre navigateur que vos préférences : le thème (clair ou sombre) et la langue choisie. Elles ne sont envoyées à aucun serveur et vous pouvez les effacer en supprimant les données du site dans votre navigateur.',
        ],
      },
      {
        heading: 'Statistiques de fréquentation',
        paragraphs: [
          'Pour savoir quelles pages sont lues, j’utilise Vercel Web Analytics. Il n’utilise pas de cookies, ne crée aucun profil de visiteur et ne vous suit pas d’un site à l’autre. Je ne reçois que des chiffres agrégés : pages vues, provenance de la visite, pays, type d’appareil et de navigateur.',
        ],
      },
      {
        heading: 'Publicité et Google AdSense',
        paragraphs: [
          'Le site peut afficher des annonces Google AdSense. Google et ses partenaires utilisent des cookies et des identifiants similaires pour afficher et mesurer les annonces et, lorsque c’est autorisé, pour les personnaliser selon vos visites sur ce site et d’autres. Je ne reçois pas ces données et je ne contrôle pas les annonces affichées.',
          'Dans l’Union européenne, au Royaume-Uni et en Suisse, les annonces dépendent de votre consentement, demandé par un message de Google. Vous pouvez modifier votre choix à tout moment et désactiver la personnalisation des annonces avec les liens ci-dessous.',
        ],
        links: GOOGLE_LINKS.fr,
      },
      {
        heading: 'Autres services tiers',
        bullets: [
          'Google Fonts : les polices du site sont chargées depuis les serveurs de Google, qui reçoivent donc votre adresse IP.',
          'Vercel et Railway : ils hébergent le site et l’API et ont leurs propres politiques de confidentialité.',
          'Liens externes (ESPN, UFC.com, réseaux sociaux et autres) : en cliquant, vous quittez Vektor MMA et suivez les règles de chacun.',
        ],
      },
      {
        heading: 'Vos droits',
        paragraphs: [
          'Au titre de la loi brésilienne sur la protection des données (LGPD) et, si vous êtes en Europe, du RGPD, vous pouvez demander l’accès, la rectification ou la suppression de données personnelles, retirer votre consentement et vous opposer au traitement. Comme le site ne conserve aucune donnée vous identifiant, ces demandes concernent en pratique ce que détiennent les services tiers ci-dessus. Pour exercer un droit, écrivez via la page de contact.',
        ],
      },
      {
        heading: 'Enfants',
        paragraphs: ['Le site ne s’adresse pas aux enfants de moins de 13 ans et ne collecte pas sciemment de données d’enfants.'],
      },
      {
        heading: 'Modifications de cette politique',
        paragraphs: ['Si le site utilise un nouveau service qui change ce qui est écrit ici, cette page sera mise à jour et la date en haut sera modifiée.'],
      },
    ],
  },
  es: {
    eyebrow: 'Transparencia',
    title: 'Política de privacidad',
    intro: 'Esta página explica con claridad qué información recibe Vektor MMA cuando lo visitas, para qué sirve y qué puedes hacer al respecto.',
    sections: [
      {
        heading: 'Quién es el responsable',
        paragraphs: [
          'Vektor MMA (vektormma.com) es un proyecto personal e independiente de Larissa Pavan, en Brasil. No hay una empresa detrás, ni equipo de ventas, ni venta de datos. Para cualquier tema de privacidad, usa la página de contacto.',
        ],
      },
      {
        heading: 'Qué datos recoge el sitio',
        paragraphs: [
          'El sitio no tiene registro, inicio de sesión, comentarios ni formularios. No pido nombre, correo, teléfono ni ningún otro dato personal, y no guardo ninguno.',
          'Cuando usas el simulador, los nombres de los dos peleadores que elegiste se envían a la API para calcular el pronóstico. Esos nombres no quedan ligados a ti.',
          'Como en cualquier sitio, los servidores de alojamiento (Vercel para las páginas y Railway para la API) registran datos técnicos de cada visita, como la dirección IP, la fecha y la hora, la página solicitada y el navegador. Esos registros sirven para la seguridad, para limitar abusos y para mantener el servicio en línea.',
        ],
      },
      {
        heading: 'Qué queda en tu navegador',
        paragraphs: [
          'El sitio guarda en el almacenamiento local de tu navegador solo tus preferencias: el tema (claro u oscuro) y el idioma elegido. No se envían a ningún servidor y puedes borrarlas eliminando los datos del sitio en tu navegador.',
        ],
      },
      {
        heading: 'Estadísticas de uso',
        paragraphs: [
          'Para saber qué páginas se leen, uso Vercel Web Analytics. No usa cookies, no crea un perfil del visitante ni te sigue por otros sitios. Solo recibo cifras agregadas: páginas vistas, origen de la visita, país y tipo de dispositivo y de navegador.',
        ],
      },
      {
        heading: 'Anuncios y Google AdSense',
        paragraphs: [
          'El sitio puede mostrar anuncios de Google AdSense. Google y sus socios usan cookies e identificadores similares para mostrar y medir anuncios y, cuando está permitido, para personalizarlos según tus visitas a este y otros sitios. Yo no recibo esos datos y no controlo qué anuncios aparecen.',
          'En la Unión Europea, el Reino Unido y Suiza, los anuncios dependen de tu consentimiento, que se pide mediante un mensaje de Google. Puedes cambiar tu elección en cualquier momento y también desactivar la personalización de anuncios con los enlaces de abajo.',
        ],
        links: GOOGLE_LINKS.es,
      },
      {
        heading: 'Otros servicios de terceros',
        bullets: [
          'Google Fonts: las fuentes del sitio se cargan desde los servidores de Google, que por eso reciben tu dirección IP.',
          'Vercel y Railway: alojan el sitio y la API y tienen sus propias políticas de privacidad.',
          'Enlaces externos (ESPN, UFC.com, redes sociales y otros): al hacer clic sales de Vektor MMA y pasas a las reglas de cada uno.',
        ],
      },
      {
        heading: 'Tus derechos',
        paragraphs: [
          'Según la Ley General de Protección de Datos de Brasil (LGPD) y, si estás en Europa, el RGPD, puedes pedir acceso, corrección o eliminación de datos personales, retirar el consentimiento y oponerte al tratamiento. Como el sitio no guarda datos que te identifiquen, esas solicitudes se refieren en la práctica a lo que mantienen los servicios de terceros mencionados. Para ejercer cualquier derecho, escribe por la página de contacto.',
        ],
      },
      {
        heading: 'Niños',
        paragraphs: ['El sitio no está dirigido a menores de 13 años y no recoge datos de niños a propósito.'],
      },
      {
        heading: 'Cambios en esta política',
        paragraphs: ['Si el sitio empieza a usar un servicio nuevo que cambie lo escrito aquí, esta página se actualizará y cambiará la fecha de arriba.'],
      },
    ],
  },
}

const TERMS: ByLang<InfoPage> = {
  pt: {
    eyebrow: 'Regras do site',
    title: 'Termos de Uso',
    intro: 'Ao usar o Vektor MMA, você concorda com as regras abaixo. Elas são curtas de propósito.',
    sections: [
      {
        heading: 'O que é o site',
        paragraphs: [
          'O Vektor MMA reúne estatísticas, rankings, resultados e previsões de vitória para o UFC, a PFL, o ONE Championship e o acervo do Bellator, além de perfis de atletas e resultados de eventos de RIZIN Fighting Federation, KSW, Legacy Fighting Alliance (LFA), Cage Warriors, OKTAGON MMA, Jungle Fight e Invicta FC. É um projeto pessoal, independente, feito para estudo e entretenimento. Não é um produto oficial nem é afiliado, patrocinado ou aprovado por nenhuma dessas organizações.',
        ],
      },
      {
        heading: 'Previsões não são conselho nem garantia',
        paragraphs: [
          'As previsões são estimativas estatísticas geradas por um modelo de aprendizado de máquina a partir de lutas passadas. Elas erram, e lutas têm resultados surpreendentes. Nada aqui é recomendação de aposta, de investimento ou de qualquer decisão financeira, e eu não me responsabilizo por decisões tomadas com base nelas.',
        ],
      },
      {
        heading: 'Precisão dos dados',
        paragraphs: [
          'Os dados vêm de fontes públicas e são atualizados por rotinas automáticas, então podem conter erros, atrasos ou lacunas. Se encontrar algo errado, avise pela página de contato; eu confiro e corrijo.',
        ],
      },
      {
        heading: 'Marcas, imagens e direitos autorais',
        paragraphs: [
          'Os nomes de lutadores, eventos e organizações, os logotipos e as fotos pertencem aos seus donos e aparecem aqui apenas para identificar e informar. O código, o modelo, os textos e a análise do site são de autoria do projeto.',
          'Se você é titular de direitos sobre uma imagem ou um texto e quer que ele seja removido, escreva pela página de contato indicando a página e o material; a remoção é feita sem demora.',
        ],
      },
      {
        heading: 'Uso aceitável',
        bullets: [
          'Use o site para consulta pessoal. Não é permitido sobrecarregar a API, contornar os limites de uso nem copiar o conteúdo em massa com robôs.',
          'Não use o site para fins ilegais nem para tentar acessar o que não é público.',
        ],
      },
      {
        heading: 'Anúncios e links de terceiros',
        paragraphs: [
          'O site pode exibir anúncios e links para outros sites. Eu não controlo nem sou responsável pelo conteúdo, pelos produtos ou pelas práticas de anunciantes e de sites externos.',
        ],
      },
      {
        heading: 'Limitação de responsabilidade',
        paragraphs: [
          'O site é oferecido como está, sem garantia de disponibilidade contínua nem de ausência de erros. Na extensão permitida em lei, não respondo por perdas decorrentes do uso do site.',
        ],
      },
      {
        heading: 'Lei aplicável e mudanças',
        paragraphs: [
          'Estes termos seguem as leis do Brasil. Eu posso alterá-los; a versão em vigor é sempre a desta página, com a data de atualização no topo.',
        ],
      },
    ],
  },
  en: {
    eyebrow: 'Site rules',
    title: 'Terms of Use',
    intro: 'By using Vektor MMA you agree to the rules below. They are short on purpose.',
    sections: [
      {
        heading: 'What the site is',
        paragraphs: [
          'Vektor MMA gathers stats, rankings, results and win predictions for the UFC, the PFL, ONE Championship and the Bellator archive, plus fighter profiles and event results from RIZIN Fighting Federation, KSW, Legacy Fighting Alliance (LFA), Cage Warriors, OKTAGON MMA, Jungle Fight and Invicta FC. It is an independent personal project, made for learning and entertainment. It is not an official product and is not affiliated with, sponsored by or endorsed by any of those organizations.',
        ],
      },
      {
        heading: 'Predictions are not advice or a guarantee',
        paragraphs: [
          'The predictions are statistical estimates produced by a machine-learning model from past fights. They are wrong at times, and fights produce surprises. Nothing here is a recommendation to bet, invest or make any financial decision, and I am not responsible for decisions made on the strength of them.',
        ],
      },
      {
        heading: 'Accuracy of the data',
        paragraphs: [
          'The data comes from public sources and is refreshed by automated jobs, so it can contain mistakes, delays or gaps. If you find something wrong, tell me through the contact page; I check and fix it.',
        ],
      },
      {
        heading: 'Trademarks, images and copyright',
        paragraphs: [
          'The names of fighters, events and organizations, the logos and the photos belong to their owners and appear here only to identify and inform. The site’s code, model, texts and analysis are the project’s own work.',
          'If you hold the rights to an image or a text and want it removed, write through the contact page naming the page and the material; it will be removed without delay.',
        ],
      },
      {
        heading: 'Acceptable use',
        bullets: [
          'Use the site for personal reference. Overloading the API, getting around the usage limits and copying the content in bulk with bots are not allowed.',
          'Do not use the site for anything illegal or to try to reach what is not public.',
        ],
      },
      {
        heading: 'Ads and third-party links',
        paragraphs: [
          'The site may show ads and links to other sites. I do not control, and am not responsible for, the content, products or practices of advertisers and external sites.',
        ],
      },
      {
        heading: 'Limitation of liability',
        paragraphs: [
          'The site is provided as it is, with no guarantee of continuous availability or of being free from errors. To the extent the law allows, I am not liable for losses arising from use of the site.',
        ],
      },
      {
        heading: 'Governing law and changes',
        paragraphs: [
          'These terms follow the laws of Brazil. I may change them; the version in force is always the one on this page, with the update date at the top.',
        ],
      },
    ],
  },
  fr: {
    eyebrow: 'Règles du site',
    title: 'Conditions d’utilisation',
    intro: 'En utilisant Vektor MMA, vous acceptez les règles ci-dessous. Elles sont courtes volontairement.',
    sections: [
      {
        heading: 'Ce qu’est le site',
        paragraphs: [
          'Vektor MMA rassemble statistiques, classements, résultats et prévisions de victoire pour l’UFC, la PFL, ONE Championship et les archives du Bellator, ainsi que des profils de combattants et des résultats d’événements de RIZIN Fighting Federation, KSW, Legacy Fighting Alliance (LFA), Cage Warriors, OKTAGON MMA, Jungle Fight et Invicta FC. C’est un projet personnel indépendant, conçu pour apprendre et se divertir. Ce n’est pas un produit officiel et il n’est ni affilié, ni parrainé, ni approuvé par ces organisations.',
        ],
      },
      {
        heading: 'Les prévisions ne sont ni un conseil ni une garantie',
        paragraphs: [
          'Les prévisions sont des estimations statistiques produites par un modèle d’apprentissage automatique à partir de combats passés. Elles se trompent parfois, et les combats réservent des surprises. Rien ici n’est une recommandation de pari, d’investissement ou de décision financière, et je ne suis pas responsable des décisions prises sur leur base.',
        ],
      },
      {
        heading: 'Exactitude des données',
        paragraphs: [
          'Les données proviennent de sources publiques et sont actualisées par des tâches automatiques ; elles peuvent donc contenir des erreurs, des retards ou des lacunes. Si vous voyez une erreur, signalez-la via la page de contact ; je vérifie et corrige.',
        ],
      },
      {
        heading: 'Marques, images et droit d’auteur',
        paragraphs: [
          'Les noms des combattants, des événements et des organisations, les logos et les photos appartiennent à leurs propriétaires et ne figurent ici que pour identifier et informer. Le code, le modèle, les textes et l’analyse du site sont l’œuvre du projet.',
          'Si vous détenez les droits sur une image ou un texte et souhaitez le faire retirer, écrivez via la page de contact en indiquant la page et le contenu ; le retrait est effectué sans délai.',
        ],
      },
      {
        heading: 'Utilisation acceptable',
        bullets: [
          'Utilisez le site pour une consultation personnelle. Il est interdit de surcharger l’API, de contourner les limites d’usage ou de copier le contenu en masse avec des robots.',
          'N’utilisez pas le site à des fins illégales ni pour tenter d’accéder à ce qui n’est pas public.',
        ],
      },
      {
        heading: 'Publicité et liens tiers',
        paragraphs: [
          'Le site peut afficher des annonces et des liens vers d’autres sites. Je ne contrôle pas, et ne suis pas responsable, du contenu, des produits ou des pratiques des annonceurs et des sites externes.',
        ],
      },
      {
        heading: 'Limitation de responsabilité',
        paragraphs: [
          'Le site est fourni tel quel, sans garantie de disponibilité continue ni d’absence d’erreurs. Dans la mesure permise par la loi, je ne réponds pas des pertes liées à l’utilisation du site.',
        ],
      },
      {
        heading: 'Droit applicable et modifications',
        paragraphs: [
          'Ces conditions relèvent du droit brésilien. Je peux les modifier ; la version en vigueur est toujours celle de cette page, avec la date de mise à jour en haut.',
        ],
      },
    ],
  },
  es: {
    eyebrow: 'Reglas del sitio',
    title: 'Términos de uso',
    intro: 'Al usar Vektor MMA aceptas las reglas de abajo. Son breves a propósito.',
    sections: [
      {
        heading: 'Qué es el sitio',
        paragraphs: [
          'Vektor MMA reúne estadísticas, ranking, resultados y pronósticos de victoria de la UFC, la PFL, ONE Championship y el archivo de Bellator, además de perfiles de peleadores y resultados de eventos de RIZIN Fighting Federation, KSW, Legacy Fighting Alliance (LFA), Cage Warriors, OKTAGON MMA, Jungle Fight e Invicta FC. Es un proyecto personal e independiente, hecho para aprender y entretener. No es un producto oficial ni está afiliado, patrocinado o aprobado por ninguna de esas organizaciones.',
        ],
      },
      {
        heading: 'Los pronósticos no son consejo ni garantía',
        paragraphs: [
          'Los pronósticos son estimaciones estadísticas producidas por un modelo de aprendizaje automático a partir de peleas pasadas. A veces fallan, y las peleas dan sorpresas. Nada aquí es una recomendación para apostar, invertir o tomar una decisión financiera, y no me hago responsable de las decisiones tomadas con base en ellos.',
        ],
      },
      {
        heading: 'Exactitud de los datos',
        paragraphs: [
          'Los datos vienen de fuentes públicas y se actualizan con procesos automáticos, así que pueden tener errores, retrasos o vacíos. Si encuentras algo incorrecto, avísame por la página de contacto; lo reviso y lo corrijo.',
        ],
      },
      {
        heading: 'Marcas, imágenes y derechos de autor',
        paragraphs: [
          'Los nombres de peleadores, eventos y organizaciones, los logotipos y las fotos pertenecen a sus dueños y aparecen aquí solo para identificar e informar. El código, el modelo, los textos y el análisis del sitio son obra del proyecto.',
          'Si eres titular de los derechos de una imagen o de un texto y quieres que se retire, escribe por la página de contacto indicando la página y el material; se retira sin demora.',
        ],
      },
      {
        heading: 'Uso aceptable',
        bullets: [
          'Usa el sitio para consulta personal. No se permite sobrecargar la API, eludir los límites de uso ni copiar el contenido en masa con bots.',
          'No uses el sitio para nada ilegal ni para intentar acceder a lo que no es público.',
        ],
      },
      {
        heading: 'Anuncios y enlaces de terceros',
        paragraphs: [
          'El sitio puede mostrar anuncios y enlaces a otros sitios. No controlo ni soy responsable del contenido, los productos o las prácticas de anunciantes y sitios externos.',
        ],
      },
      {
        heading: 'Limitación de responsabilidad',
        paragraphs: [
          'El sitio se ofrece tal como está, sin garantía de disponibilidad continua ni de ausencia de errores. En la medida que la ley lo permita, no respondo por pérdidas derivadas del uso del sitio.',
        ],
      },
      {
        heading: 'Ley aplicable y cambios',
        paragraphs: [
          'Estos términos se rigen por las leyes de Brasil. Puedo modificarlos; la versión vigente es siempre la de esta página, con la fecha de actualización arriba.',
        ],
      },
    ],
  },
}

const CONTACT: ByLang<InfoPage> = {
  pt: {
    eyebrow: 'Fale conosco',
    title: 'Contato',
    intro: 'Achou um erro nos dados, tem uma sugestão ou precisa falar sobre privacidade ou direitos autorais? Escreva. Eu leio todas as mensagens.',
    sections: [
      {
        heading: 'Sobre o que escrever',
        bullets: [
          'Correção de dados: um cartel, um resultado, um evento ou um perfil que esteja errado.',
          'Sugestões e dúvidas sobre o modelo de previsão e sobre como ler as probabilidades.',
          'Pedido de remoção de imagem ou texto, se você é titular dos direitos.',
          'Privacidade: qualquer pedido ligado à Política de Privacidade.',
          'Parcerias, imprensa e outros assuntos.',
        ],
      },
      {
        heading: 'Onde me encontrar',
        paragraphs: ['O jeito mais rápido de reportar um erro é abrir um pedido (issue) no repositório do projeto no GitHub. Para o resto, use qualquer um dos canais abaixo.'],
        links: CHANNELS,
      },
      {
        heading: 'Quando você recebe a resposta',
        paragraphs: ['O Vektor MMA é um projeto pessoal, tocado por uma pessoa só. Eu respondo assim que consigo, e pedidos de remoção e de privacidade têm prioridade.'],
      },
    ],
  },
  en: {
    eyebrow: 'Get in touch',
    title: 'Contact',
    intro: 'Found a mistake in the data, have a suggestion, or need to talk about privacy or copyright? Write to me. I read every message.',
    sections: [
      {
        heading: 'What to write about',
        bullets: [
          'Data corrections: a record, a result, an event or a profile that is wrong.',
          'Suggestions and questions about the prediction model and how to read the probabilities.',
          'A request to remove an image or text, if you hold the rights.',
          'Privacy: any request tied to the Privacy Policy.',
          'Partnerships, press and anything else.',
        ],
      },
      {
        heading: 'Where to find me',
        paragraphs: ['The quickest way to report a mistake is to open an issue in the project’s repository on GitHub. For everything else, use any of the channels below.'],
        links: CHANNELS,
      },
      {
        heading: 'When you get an answer',
        paragraphs: ['Vektor MMA is a personal project run by one person. I answer as soon as I can, and removal and privacy requests come first.'],
      },
    ],
  },
  fr: {
    eyebrow: 'Nous écrire',
    title: 'Contact',
    intro: 'Vous avez trouvé une erreur dans les données, vous avez une suggestion ou vous voulez parler de confidentialité ou de droit d’auteur ? Écrivez-moi. Je lis tous les messages.',
    sections: [
      {
        heading: 'De quoi écrire',
        bullets: [
          'Correction de données : un palmarès, un résultat, un événement ou un profil erroné.',
          'Suggestions et questions sur le modèle de prévision et sur la lecture des probabilités.',
          'Demande de retrait d’une image ou d’un texte, si vous détenez les droits.',
          'Confidentialité : toute demande liée à la Politique de confidentialité.',
          'Partenariats, presse et autres sujets.',
        ],
      },
      {
        heading: 'Où me trouver',
        paragraphs: ['Le moyen le plus rapide de signaler une erreur est d’ouvrir un ticket (issue) dans le dépôt du projet sur GitHub. Pour le reste, utilisez l’un des canaux ci-dessous.'],
        links: CHANNELS,
      },
      {
        heading: 'Quand vous aurez une réponse',
        paragraphs: ['Vektor MMA est un projet personnel mené par une seule personne. Je réponds dès que je le peux, et les demandes de retrait et de confidentialité passent en premier.'],
      },
    ],
  },
  es: {
    eyebrow: 'Escríbenos',
    title: 'Contacto',
    intro: '¿Encontraste un error en los datos, tienes una sugerencia o necesitas hablar de privacidad o derechos de autor? Escríbeme. Leo todos los mensajes.',
    sections: [
      {
        heading: 'Sobre qué escribir',
        bullets: [
          'Corrección de datos: un récord, un resultado, un evento o un perfil que esté mal.',
          'Sugerencias y dudas sobre el modelo de pronóstico y sobre cómo leer las probabilidades.',
          'Solicitud de retiro de una imagen o un texto, si eres titular de los derechos.',
          'Privacidad: cualquier solicitud ligada a la Política de privacidad.',
          'Alianzas, prensa y otros temas.',
        ],
      },
      {
        heading: 'Dónde encontrarme',
        paragraphs: ['La forma más rápida de reportar un error es abrir un issue en el repositorio del proyecto en GitHub. Para lo demás, usa cualquiera de los canales de abajo.'],
        links: CHANNELS,
      },
      {
        heading: 'Cuándo recibes la respuesta',
        paragraphs: ['Vektor MMA es un proyecto personal llevado por una sola persona. Respondo apenas puedo, y las solicitudes de retiro y de privacidad van primero.'],
      },
    ],
  },
}

const GUIDE: ByLang<InfoPage> = {
  pt: {
    eyebrow: 'Guia',
    title: 'Como ler as previsões',
    intro: 'Cada confronto do simulador vem com uma probabilidade de vitória e uma lista de fatores. Este guia explica o que esses números significam e o que não significam.',
    sections: [
      {
        heading: 'O que uma probabilidade quer dizer',
        paragraphs: [
          'Se o modelo dá 65% de chance a um lutador, isso não é uma promessa de que ele vai vencer. Significa que, em 100 lutas parecidas, o favorito venceu cerca de 65. Em outras palavras, o azarão ainda ganha em mais de uma a cada três vezes. Probabilidades perto de 50% indicam um confronto equilibrado.',
        ],
      },
      {
        heading: 'O que o modelo olha',
        paragraphs: [
          'Para cada luta, o modelo compara os dois atletas pelo que se sabia antes do gongo: idade, altura e envergadura, número de lutas e vitórias no UFC, sequência recente, tempo parado, pontuação Elo, precisão e defesa de golpes, quedas e tempo de controle, além de se a luta é pelo cinturão e quantos rounds terá. Ele não vê o resultado nem nada que aconteceu depois da luta.',
        ],
      },
      {
        heading: 'Quanto ele acerta',
        paragraphs: [
          'Em lutas recentes, que o modelo não viu no treino, ele acerta o vencedor em cerca de 6 de cada 10 lutas, melhor que o cara ou coroa (5 em 10), mas longe de infalível. A página Desempenho mostra esse resultado com as lutas reais e compara com regras simples, como escolher o lutador com mais vitórias.',
        ],
        links: [
          { label: 'Ver o modelo e as métricas', href: '/model' },
          { label: 'Ver o histórico de acertos', href: '/track-record' },
        ],
      },
      {
        heading: 'Como ler os fatores',
        paragraphs: [
          'Abaixo da previsão, as barras mostram quais características mais empurraram o resultado para um lutador ou para o outro, calculadas com SHAP. Elas explicam o cálculo do modelo, não a causa de uma vitória: uma diferença de idade pesar a favor de alguém não significa que a idade vá decidir a luta.',
        ],
      },
      {
        heading: 'O que o modelo não sabe',
        bullets: [
          'Lesões, corte de peso, preparação do camp e o estado emocional de cada lutador.',
          'Estreantes e lutadores com poucas lutas: sem histórico, o modelo usa valores típicos e a previsão fica mais incerta.',
          'O estilo contra estilo de forma detalhada, como um grappler contra um striker.',
          'Lutas fora do UFC: o histórico em outras organizações não entra nas contas.',
        ],
      },
      {
        heading: 'Como usar',
        paragraphs: [
          'Trate a previsão como ponto de partida para pensar o confronto, não como palpite pronto. Compare com o histórico direto, a análise de confronto e os rankings. O projeto é feito para estudo e entretenimento; não é conselho de apostas.',
        ],
        links: [
          { label: 'Abrir o simulador', href: '/predictor' },
          { label: 'Ver o confronto direto', href: '/head-to-head' },
        ],
      },
    ],
  },
  en: {
    eyebrow: 'Guide',
    title: 'How to read the predictions',
    intro: 'Every matchup in the predictor comes with a win probability and a list of factors. This guide explains what those numbers mean and what they do not.',
    sections: [
      {
        heading: 'What a probability means',
        paragraphs: [
          'If the model gives a fighter a 65% chance, that is not a promise that he or she will win. It means that out of 100 similar fights, the favorite won about 65. Put differently, the underdog still wins more than one time in three. Probabilities near 50% point to an evenly matched fight.',
        ],
      },
      {
        heading: 'What the model looks at',
        paragraphs: [
          'For each fight the model compares the two athletes by what was known before the opening bell: age, height and reach, number of UFC fights and wins, recent streak, time off, Elo rating, striking accuracy and defense, takedowns and control time, plus whether it is a title fight and how many rounds it has. It sees neither the result nor anything that happened after the fight.',
        ],
      },
      {
        heading: 'How often it is right',
        paragraphs: [
          'On recent fights it did not see in training, it picks the winner in about 6 of every 10 fights, better than a coin flip (5 in 10) but far from infallible. The Track record page shows this on real fights and compares it with simple rules, such as picking the fighter with more wins.',
        ],
        links: [
          { label: 'See the model and its metrics', href: '/model' },
          { label: 'See the track record', href: '/track-record' },
        ],
      },
      {
        heading: 'How to read the factors',
        paragraphs: [
          'Below the prediction, bars show which characteristics pushed the result most toward one fighter or the other, calculated with SHAP. They explain the model’s arithmetic, not the cause of a win: an age gap weighing for someone does not mean age will decide the fight.',
        ],
      },
      {
        heading: 'What the model does not know',
        bullets: [
          'Injuries, weight cuts, training camp and each fighter’s state of mind.',
          'Debutants and fighters with few fights: without a record, the model uses typical values and the prediction is less certain.',
          'Style against style in detail, such as a grappler against a striker.',
          'Fights outside the UFC: the record in other organizations is not in the calculation.',
        ],
      },
      {
        heading: 'How to use it',
        paragraphs: [
          'Treat the prediction as a starting point for thinking about the matchup, not a ready-made pick. Compare it with the head-to-head history, the matchup analysis and the rankings. The project is made for learning and entertainment; it is not betting advice.',
        ],
        links: [
          { label: 'Open the predictor', href: '/predictor' },
          { label: 'See the head-to-head', href: '/head-to-head' },
        ],
      },
    ],
  },
  fr: {
    eyebrow: 'Guide',
    title: 'Comment lire les prévisions',
    intro: 'Chaque affrontement du simulateur s’accompagne d’une probabilité de victoire et d’une liste de facteurs. Ce guide explique ce que ces chiffres signifient et ce qu’ils ne signifient pas.',
    sections: [
      {
        heading: 'Ce que signifie une probabilité',
        paragraphs: [
          'Si le modèle donne 65 % de chances à un combattant, ce n’est pas la promesse qu’il va gagner. Cela veut dire que, sur 100 combats semblables, le favori en a gagné environ 65. Autrement dit, l’outsider l’emporte encore plus d’une fois sur trois. Une probabilité proche de 50 % annonce un combat équilibré.',
        ],
      },
      {
        heading: 'Ce que regarde le modèle',
        paragraphs: [
          'Pour chaque combat, le modèle compare les deux athlètes d’après ce que l’on savait avant le premier gong : âge, taille et allonge, nombre de combats et de victoires à l’UFC, série récente, temps d’inactivité, cote Elo, précision et défense en frappe, amenées au sol et temps de contrôle, ainsi que le fait que ce soit un combat pour le titre et le nombre de rounds. Il ne voit ni le résultat ni rien de ce qui s’est passé après le combat.',
        ],
      },
      {
        heading: 'Son taux de réussite',
        paragraphs: [
          'Sur des combats récents qu’il n’a pas vus à l’entraînement, il trouve le vainqueur environ 6 fois sur 10, mieux que pile ou face (5 sur 10), mais loin d’être infaillible. La page Bilan le montre sur de vrais combats et le compare à des règles simples, comme choisir le combattant qui a le plus de victoires.',
        ],
        links: [
          { label: 'Voir le modèle et ses mesures', href: '/model' },
          { label: 'Voir l’historique des résultats', href: '/track-record' },
        ],
      },
      {
        heading: 'Comment lire les facteurs',
        paragraphs: [
          'Sous la prévision, des barres montrent quelles caractéristiques ont le plus fait pencher le résultat vers un combattant ou l’autre, calculées avec SHAP. Elles expliquent le calcul du modèle, pas la cause d’une victoire : un écart d’âge qui joue pour quelqu’un ne signifie pas que l’âge décidera du combat.',
        ],
      },
      {
        heading: 'Ce que le modèle ne sait pas',
        bullets: [
          'Les blessures, la perte de poids, la préparation du camp et l’état d’esprit de chacun.',
          'Les débutants et les combattants avec peu de combats : sans historique, le modèle utilise des valeurs typiques et la prévision est plus incertaine.',
          'Le style contre style en détail, comme un lutteur contre un frappeur.',
          'Les combats hors UFC : le palmarès dans d’autres organisations n’entre pas dans le calcul.',
        ],
      },
      {
        heading: 'Comment l’utiliser',
        paragraphs: [
          'Considérez la prévision comme un point de départ pour réfléchir à l’affrontement, pas comme un pronostic tout fait. Comparez-la à l’historique direct, à l’analyse de l’affrontement et aux classements. Le projet est fait pour apprendre et se divertir ; ce n’est pas un conseil de pari.',
        ],
        links: [
          { label: 'Ouvrir le simulateur', href: '/predictor' },
          { label: 'Voir le face-à-face', href: '/head-to-head' },
        ],
      },
    ],
  },
  es: {
    eyebrow: 'Guía',
    title: 'Cómo leer los pronósticos',
    intro: 'Cada enfrentamiento del simulador viene con una probabilidad de victoria y una lista de factores. Esta guía explica qué significan esos números y qué no significan.',
    sections: [
      {
        heading: 'Qué quiere decir una probabilidad',
        paragraphs: [
          'Si el modelo le da 65 % de probabilidad a un peleador, eso no es una promesa de que vaya a ganar. Significa que, de 100 peleas parecidas, el favorito ganó cerca de 65. Dicho de otro modo, el no favorito todavía gana más de una de cada tres veces. Las probabilidades cercanas al 50 % indican una pelea pareja.',
        ],
      },
      {
        heading: 'Qué mira el modelo',
        paragraphs: [
          'En cada pelea, el modelo compara a los dos atletas con lo que se sabía antes de la campana: edad, estatura y alcance, número de peleas y victorias en la UFC, racha reciente, tiempo de inactividad, puntuación Elo, precisión y defensa de golpeo, derribos y tiempo de control, además de si es pelea por el título y cuántos asaltos tiene. No ve el resultado ni nada de lo que pasó después de la pelea.',
        ],
      },
      {
        heading: 'Cuánto acierta',
        paragraphs: [
          'En peleas recientes que no vio al entrenar, acierta el ganador en cerca de 6 de cada 10 peleas, mejor que lanzar una moneda (5 de cada 10), pero lejos de ser infalible. La página Historial lo muestra con peleas reales y lo compara con reglas simples, como elegir al peleador con más victorias.',
        ],
        links: [
          { label: 'Ver el modelo y sus métricas', href: '/model' },
          { label: 'Ver el historial de aciertos', href: '/track-record' },
        ],
      },
      {
        heading: 'Cómo leer los factores',
        paragraphs: [
          'Debajo del pronóstico, unas barras muestran qué características empujaron más el resultado hacia un peleador o el otro, calculadas con SHAP. Explican la cuenta del modelo, no la causa de una victoria: que una diferencia de edad pese a favor de alguien no significa que la edad vaya a decidir la pelea.',
        ],
      },
      {
        heading: 'Lo que el modelo no sabe',
        bullets: [
          'Lesiones, corte de peso, preparación del campamento y el estado de ánimo de cada peleador.',
          'Debutantes y peleadores con pocas peleas: sin historial, el modelo usa valores típicos y el pronóstico es más incierto.',
          'El estilo contra estilo en detalle, como un luchador contra un striker.',
          'Peleas fuera de la UFC: el récord en otras organizaciones no entra en el cálculo.',
        ],
      },
      {
        heading: 'Cómo usarlo',
        paragraphs: [
          'Toma el pronóstico como punto de partida para pensar el enfrentamiento, no como un pronóstico ya hecho. Compáralo con el historial directo, el análisis del enfrentamiento y el ranking. El proyecto está hecho para aprender y entretener; no es consejo de apuestas.',
        ],
        links: [
          { label: 'Abrir el simulador', href: '/predictor' },
          { label: 'Ver el cara a cara', href: '/head-to-head' },
        ],
      },
    ],
  },
}

const PAGES: Record<InfoPageId, ByLang<InfoPage>> = { privacy: PRIVACY, terms: TERMS, contact: CONTACT, guide: GUIDE }

const EMAIL_LABEL: ByLang = { pt: 'E-mail', en: 'Email', fr: 'E-mail', es: 'Correo' }

/** The page in one language. With a contact address, the contact page lists it first among the channels. */
export function infoPage(id: InfoPageId, lang: UiLang, email?: string): InfoPage {
  const page = PAGES[id][lang]
  if (id !== 'contact' || !email) return page
  return {
    ...page,
    sections: page.sections.map((section) =>
      section.links === CHANNELS ? { ...section, links: [{ label: `${EMAIL_LABEL[lang]}: ${email}`, href: `mailto:${email}` }, ...CHANNELS] } : section,
    ),
  }
}

export function updatedLabel(lang: UiLang): string {
  return UPDATED_LABEL[lang]
}
