import { CompanySettings, QuotationStatus, ServiceTemplate } from '../types/quotation';

export const DEFAULT_LOGO_PATH = '/assets/aistudio/TM_Industrial_Solutions_Logo_efbca0fe.png';

export const QUOTATION_STATUSES: QuotationStatus[] = [
  'Draft',
  'Sent',
  'Under Discussion',
  'Accepted',
  'Rejected',
  'Expired',
];

export const DEFAULT_UNIT_TYPES = ['Per Day', 'Per Job', 'Per Machine', 'Per Point', 'Per Sample', 'Lump Sum'];

export const DEFAULT_COMPANY_INTRO = `TM Industrial Solution provides advanced condition monitoring, machine diagnostics and reliability engineering services to help industries improve equipment performance, minimize unexpected failures and enhance machinery reliability.

Our expertise includes vibration analysis, precision laser shaft alignment, fan and blower balancing, oil analysis, thermography and industrial troubleshooting.`;

export const DEFAULT_TERMS: string[] = [
  'The quotation is valid for 30 days from the date of issue unless otherwise specified.',
  'GST will be charged as applicable.',
  'Customer shall provide the required manpower, equipment accessibility and necessary work permits.',
  'Required machine shutdown and isolation shall be arranged by the customer.',
  'Any additional work beyond the agreed scope shall be charged separately.',
  'Payment terms shall be as mutually agreed.',
  'Travel, accommodation and other applicable expenses shall be charged separately unless included in the quotation.',
  'The customer shall ensure safe working conditions at the site.',
  'Any delay caused by site conditions or customer-side arrangements may affect the execution schedule.',
];

export const DEFAULT_PAYMENT_TERMS =
  '100% payment within 15 days from the date of invoice submission upon completion of job / report delivery.';

export const DEFAULT_DELIVERABLES: string[] = [
  'Comprehensive technical inspection report with measured data and condition severity ratings.',
  'Diagnostic plots, trend charts, and fault observations for covered machinery.',
  'Prioritized corrective engineering recommendations for maintenance planning.',
];

export const DEFAULT_CUSTOMER_ARRANGEMENTS: string[] = [
  'Safe plant access, necessary work permits, and site safety induction.',
  'Availability of machines under representative operating load and speed.',
  'Site representative coordination and equipment list / operating parameters.',
];

export const STRUCTURED_VIBRATION_SCOPE_PRESET = {
  scopeOverview:
    'Vibration analysis is carried out to evaluate machine vibration levels and identify potential mechanical issues through measurement, signal analysis and engineering assessment.',
  services: [
    {
      title: 'Pre-Job Review & Site Coordination',
      description:
        'Review the equipment list and coordinate with the customer representative before commencing measurements.',
      scopePoints: [
        'Review equipment details and operating conditions provided by the customer.',
        'Confirm equipment accessibility, operating status and measurement locations.',
        'Coordinate site safety requirements, permits and required machine availability.',
      ],
    },
    {
      title: 'Vibration Measurements',
      description:
        'Collect vibration data at accessible bearing housings and designated measurement locations while equipment is operating under representative conditions.',
      scopePoints: [
        'Measure overall vibration velocity (RMS) in the applicable frequency range.',
        'Acquire vibration readings in horizontal, vertical and axial directions, as applicable.',
        'Capture acceleration and high-frequency data where required and supported by the measurement plan.',
        'Record machine speed (RPM) and relevant operating observations.',
      ],
    },
    {
      title: 'Signal & Spectrum Analysis',
      description:
        'Evaluate collected vibration data to identify characteristic vibration patterns and potential mechanical faults.',
      scopePoints: [
        'FFT spectrum analysis for identification of dominant frequencies.',
        'Time waveform review to assess vibration behaviour.',
        'Assess indications associated with imbalance, misalignment, looseness and bearing-related issues.',
        'Review trends and compare results with available historical data, where provided.',
      ],
    },
    {
      title: 'Assessment & Reporting',
      description:
        'Prepare a technical summary of the measured condition and communicate findings to the customer.',
      scopePoints: [
        'Classify observed machine condition based on measured data and applicable evaluation criteria.',
        'Highlight abnormal readings and suspected fault mechanisms.',
        'Provide practical recommendations for further inspection or corrective action.',
        'Submit a vibration analysis report for the equipment covered in the agreed scope.',
      ],
    },
  ],
};

export function createDefaultCompanySettings(ownerId: string): CompanySettings {
  return {
    ownerId,
    companyName: 'TM INDUSTRIAL SOLUTION',
    tagline: 'THE INTELLIGENCE BEHIND RELIABLE MACHINES.',
    contactPerson: 'Rinkesh Patel',
    designation: 'Founder & Lead Reliability Engineer',
    phone: '+91 9106616179',
    email: 'services@tmsolution.in',
    website: 'https://tmsolution.in',
    googleMapsUrl: 'https://maps.app.goo.gl/BRP7ow1BRbouxfSN9',
    address: '',
    gstin: '',
    logoUrl: DEFAULT_LOGO_PATH,
    defaultGstRate: 18,
    quotationPrefix: 'TMIS',
    financialYear: '2026-27',
    nextSerialNumber: 1,
    defaultValidityDays: 30,
    defaultCompanyIntro: DEFAULT_COMPANY_INTRO,
    defaultTerms: [...DEFAULT_TERMS],
    defaultPaymentTerms: DEFAULT_PAYMENT_TERMS,
    signatoryName: 'Rinkesh Patel',
    signatoryTitle: 'Authorized Signatory',
    bankDetails: {
      bankName: '',
      accountName: '',
      accountNumber: '',
      ifscCode: '',
      branch: '',
      upiId: '',
    },
  };
}

export const INITIAL_SERVICE_LIBRARY: Omit<ServiceTemplate, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Vibration Analysis',
    description:
      'Detects imbalance, misalignment, bearing wear and mechanical faults through FFT spectrum and waveform evaluation.',
    scopePoints: [
      'Measurement of overall vibration velocity and acceleration across all bearing locations.',
      'FFT spectrum analysis for precise fault frequency identification.',
      'Time waveform analysis for impact and looseness verification.',
      'Bearing condition assessment and envelope demodulation diagnostics.',
      'Identification of abnormal vibration sources and severity grading as per ISO 20816.',
      'Preparation of detailed technical report with spectral plots and health ratings.',
      'Actionable engineering recommendations for corrective maintenance.',
    ],
    defaultPrice: 15000,
    unitType: 'Per Day',
  },
  {
    name: 'Laser Shaft Alignment',
    description:
      'Improves machine efficiency, reduces bearing and seal wear, and extends rotating equipment life using precision laser alignment.',
    scopePoints: [
      'Initial vibration measurement and baseline condition check (if applicable).',
      'Soft foot inspection and shim correction on machine feet.',
      'Precision horizontal and vertical laser shaft alignment measurement.',
      'Correction of angular and parallel offset misalignment within ISO tolerances.',
      'Thermal growth compensation calculation and offset setting (if applicable).',
      'Final verification run and detailed as-found / as-left alignment report.',
    ],
    defaultPrice: 12000,
    unitType: 'Per Job',
  },
  {
    name: 'Oil Analysis',
    description:
      'Monitors lubricant condition to detect contamination, wear metals, and thermal degradation before catastrophic bearing failure.',
    scopePoints: [
      'Representative lubricant sampling from active circulating oil reservoirs and gearboxes.',
      'Kinematic viscosity testing at 40°C / 100°C and viscosity index evaluation.',
      'Wear metal elemental spectroscopy and ferrous debris quantification.',
      'Moisture / water content, particle count (ISO 4406), and contamination screening.',
      'Acid number (TAN), oxidation, and additive depletion assessment.',
      'Comprehensive laboratory report with lubricant health rating and filtration recommendations.',
    ],
    defaultPrice: 4500,
    unitType: 'Per Job',
  },
  {
    name: 'Fan & Blower Balancing',
    description:
      'Eliminates rotor imbalance, minimizes structural vibration, and restores smooth, reliable operation of industrial air handling units.',
    scopePoints: [
      'Initial vibration measurement, phase angle capture, and mechanical health inspection.',
      'Verification of imbalance dominance vs. looseness or resonance.',
      'Trial weight calculation, placement, and influence coefficient measurement.',
      'Precision single-plane or dual-plane on-site dynamic balancing.',
      'Final trim balancing and post-correction vibration verification as per ISO 1940 / ISO 21940.',
      'Comprehensive balancing report with before/after amplitude and phase plots.',
    ],
    defaultPrice: 18000,
    unitType: 'Per Job',
  },
  {
    name: 'Thermography',
    description:
      'Identifies electrical hotspots, loose terminations, and mechanical thermal anomalies before unplanned outages occur.',
    scopePoints: [
      'Non-contact infrared thermal scanning of electrical panels, switchgear, and transformers.',
      'Thermal inspection of motor windings, bearing housings, couplings, and process lines.',
      'Quantitative temperature delta analysis against ambient and reference phases.',
      'Hotspot severity classification and priority action tagging.',
      'High-resolution thermal and visible-light comparison imagery.',
      'Detailed thermography inspection report with prioritized corrective actions.',
    ],
    defaultPrice: 14000,
    unitType: 'Per Day',
  },
  {
    name: 'Troubleshooting',
    description:
      'Root cause analysis for complex vibration, resonance, premature bearing failure, and recurring operational machinery issues.',
    scopePoints: [
      'Comprehensive review of machine design, operating history, and failure symptoms.',
      'Multi-channel vibration, phase, bump test, and run-up / coast-down diagnostics.',
      'Structural resonance, critical speed, and foundation stiffness evaluation.',
      'Cross-correlation with process parameters, load conditions, and alignment history.',
      'Root cause identification supported by field measurement evidence.',
      'Detailed root cause analysis (RCA) report with permanent corrective engineering plan.',
    ],
    defaultPrice: 20000,
    unitType: 'Per Day',
  },
];

export const INDIAN_STATES: string[] = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];
