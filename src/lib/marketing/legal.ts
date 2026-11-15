export type LegalDocument = {
  title: string
  updated: string
  intro: string
  sections: { heading: string; paragraphs: string[] }[]
}

/**
 * The platform's legal pages.
 *
 * These describe the PUNCHED platform — the operator, what the software does
 * with information and the terms of using it. They deliberately do not make
 * claims about any individual business: a business that runs a storefront on
 * Punched owns and is responsible for the customer information it manages, and
 * the platform's own terms say so.
 *
 * `SUPPORT_EMAIL` is the platform's published support address (the same one the
 * API configuration carries), not a business's.
 */

export const SUPPORT_EMAIL = 'support@punched.app'

const UPDATED = 'July 2026'

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy Policy',
  updated: UPDATED,
  intro:
    'This policy explains what information Punched collects when you use the platform and how we handle it. It describes the platform itself. A business you interact with through Punched is responsible for the customer information it manages on the platform.',
  sections: [
    {
      heading: 'Information we collect',
      paragraphs: [
        'Account information you provide when you register — such as your name, email address and phone number — together with the business profile details you enter.',
        'The customer, appointment, loyalty and staff records a business creates while using the platform. These belong to the business, and the business decides who can see them.',
        'Technical information generated as the software runs, such as device and browser type, and general usage data that helps us keep the service working and secure.',
      ],
    },
    {
      heading: 'How we use information',
      paragraphs: [
        'To provide the service: authenticating you, operating the features you enable, sending the notifications you or your customers have asked for, and supporting you when you contact us.',
        'To keep the platform reliable and secure, and to understand how it is used so we can improve it.',
      ],
    },
    {
      heading: 'Sharing',
      paragraphs: [
        'We do not sell personal information.',
        'We share information with the service providers that help us run the platform (for example, hosting and messaging providers), only as needed to operate the service.',
        'We may disclose information where the law requires it or where it is necessary to protect the platform and its users.',
      ],
    },
    {
      heading: 'Security and retention',
      paragraphs: [
        'We apply reasonable technical and organisational measures to protect information, and we keep it for as long as the service needs it or the law requires.',
      ],
    },
    {
      heading: 'Your choices',
      paragraphs: [
        'You can ask to access, correct or delete your account information. Where you are a customer of a business on the platform, direct requests about your records to that business, which controls them.',
        `To make a request, email ${SUPPORT_EMAIL}.`,
      ],
    },
  ],
}


export const TERMS_OF_SERVICE: LegalDocument = {
  title: 'Terms of Service',
  updated: UPDATED,
  intro:
    'These terms govern your use of the Punched platform. By creating an account or using the platform, you agree to them.',
  sections: [
    {
      heading: 'Using the platform',
      paragraphs: [
        'You must provide accurate information when you register and keep your account credentials secure. You are responsible for activity carried out through your account.',
        'You may use the platform only for lawful purposes and in line with any plan or agreement that applies to your business.',
      ],
    },
    {
      heading: 'Your content and your customers',
      paragraphs: [
        'You keep ownership of the information you and your business put into the platform, and you grant us the limited rights needed to host and operate it for you.',
        'You are responsible for having the necessary permissions to store and use your customers\u2019 information, and for the notices and consents your customers require.',
      ],
    },
    {
      heading: 'Fees and subscriptions',
      paragraphs: [
        'Paid features are provided under the plan you choose. Fees, billing periods and any applicable taxes are described when you subscribe.',
      ],
    },
    {
      heading: 'Availability and changes',
      paragraphs: [
        'We work to keep the platform available, but we do not promise uninterrupted service. We may add, change or remove features over time.',
      ],
    },
    {
      heading: 'Ending your access',
      paragraphs: [
        'You may stop using the platform at any time. We may suspend or end access if these terms are breached or if the law requires it.',
      ],
    },
    {
      heading: 'Contact',
      paragraphs: [`Questions about these terms: ${SUPPORT_EMAIL}.`],
    },
  ],
}

export const LEGAL_INFORMATION: LegalDocument = {
  title: 'Legal information',
  updated: UPDATED,
  intro:
    'General legal information for the Punched platform, including how to reach us and who owns what.',
  sections: [
    {
      heading: 'The platform',
      paragraphs: [
        'Punched is a software platform for businesses — loyalty, appointments, customers and staff in one place. Each business that publishes a page on the platform is an independent operator, responsible for its own services and content.',
      ],
    },
    {
      heading: 'Intellectual property',
      paragraphs: [
        'The platform, its software and its brand are owned by Punched. The content a business publishes on its own pages remains that business\u2019s.',
      ],
    },
    {
      heading: 'Notices',
      paragraphs: [
        `For legal notices, or questions about the platform\u2019s terms and policies, email ${SUPPORT_EMAIL}.`,
      ],
    },
    {
      heading: 'Related policies',
      paragraphs: [
        'How we handle information is described in the Privacy Policy. The rules for using the platform are set out in the Terms of Service.',
      ],
    },
  ],
}
