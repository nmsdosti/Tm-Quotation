import {
  CompanySettings,
  QuotationStatus,
  ServiceScopeStage,
  ServiceTemplate,
} from '../types/quotation';

export const DEFAULT_LOGO_PATH = '/assets/aistudio/TM_Industrial_Solutions_Logo_efbca0fe.png';

export const QUOTATION_STATUSES: QuotationStatus[] = [
  'Draft',
  'Sent',
  'Under Discussion',
  'Accepted',
  'Rejected',
  'Expired',
];

export const DEFAULT_UNIT_TYPES = [
  'Per Day',
  'Per Job',
  'Per Machine',
  'Per Point',
  'Per Sample',
  'Lump Sum',
];

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

function makeStages(
  prefix: string,
  list: { title: string; description: string; scopePoints: string[] }[]
): ServiceScopeStage[] {
  return list.map((item, idx) => ({
    id: `${prefix}_st_${idx + 1}`,
    title: item.title,
    description: item.description,
    scopePoints: item.scopePoints,
  }));
}

export const INITIAL_SERVICE_LIBRARY: Omit<
  ServiceTemplate,
  'id' | 'ownerId' | 'createdAt' | 'updatedAt'
>[] = [
  {
    name: 'Vibration Analysis',
    description:
      'Vibration analysis is carried out to evaluate machine vibration levels and identify potential mechanical issues through measurement, signal analysis and engineering assessment.',
    stages: makeStages('vib', [
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
    ]),
    deliverables: [
      'Detailed vibration analysis report with ISO 20816 severity classification.',
      'FFT spectrum and time waveform diagnostic plots for abnormal machines.',
      'Prioritized engineering recommendations for corrective maintenance.',
    ],
    customerArrangements: [
      'Equipment list, operating parameters, and safe access to bearing housings.',
      'Machines running under normal representative operating load during measurement.',
      'Work permits, safety induction, and site engineer coordination.',
    ],
    scopePoints: [],
    defaultPrice: 15000,
    unitType: 'Per Day',
  },
  {
    name: 'Laser Shaft Alignment',
    description:
      'Precision laser shaft alignment is carried out to minimize shaft coupling stresses, reduce bearing and seal wear, and improve overall rotating equipment efficiency.',
    stages: makeStages('lsa', [
      {
        title: 'Pre-Alignment Inspection & Baseline Check',
        description:
          'Inspect machine foundation, coupling condition, and record baseline operating status prior to alignment.',
        scopePoints: [
          'Conduct initial baseline vibration measurement (if machine is running).',
          'Inspect baseplate, mounting bolts, shims, and coupling condition.',
          'Verify lockout / tagout (LOTO) isolation and safe rotation of shafts.',
        ],
      },
      {
        title: 'Soft Foot Inspection & Correction',
        description:
          'Identify and eliminate frame distortion caused by uneven machine foot seating before alignment.',
        scopePoints: [
          'Perform laser soft foot check on all movable machine feet.',
          'Identify parallel or angular soft foot conditions and shim imperfections.',
          'Install calibrated stainless-steel pre-cut shims to bring soft foot within tolerance.',
        ],
      },
      {
        title: 'Precision Laser Alignment & Thermal Compensation',
        description:
          'Measure and correct vertical and horizontal angular and parallel offset misalignment using dual-laser instrumentation.',
        scopePoints: [
          'Record as-found vertical and horizontal angular & offset alignment values.',
          'Apply thermal growth targets where applicable for hot-running equipment.',
          'Perform vertical shimming and horizontal live-move adjustments within ISO tolerances.',
        ],
      },
      {
        title: 'Final Verification & Alignment Reporting',
        description:
          'Confirm final bolted alignment accuracy and provide traceable as-found / as-left documentation.',
        scopePoints: [
          'Re-torque anchor bolts and verify final as-left alignment readings.',
          'Check post-alignment running vibration where applicable.',
          'Submit detailed laser alignment report with as-found and as-left tolerances.',
        ],
      },
    ]),
    deliverables: [
      'As-found and as-left laser shaft alignment report with tolerance charts.',
      'Soft foot check documentation and shim adjustment record.',
      'Mechanical observations and coupling / foundation recommendations.',
    ],
    customerArrangements: [
      'Complete electrical isolation (LOTO) and machine shutdown during alignment.',
      'Mechanical fitter manpower, lifting / jacking tools, and calibrated SS shims (unless supplied).',
      'Work permits and unhindered access to coupling and machine feet.',
    ],
    scopePoints: [],
    defaultPrice: 12000,
    unitType: 'Per Job',
  },
  {
    name: 'Oil Analysis',
    description:
      'Lubricant condition monitoring is performed to evaluate oil health, detect wear metals and contamination early, and prevent premature bearing or gear failure.',
    stages: makeStages('oil', [
      {
        title: 'Sampling Plan & Lubricant Collection',
        description:
          'Establish representative sampling points and collect uncontaminated oil samples from active machinery.',
        scopePoints: [
          'Review lubricant grades, equipment reservoirs, and operating hours.',
          'Collect representative samples using clean sampling pumps and sterile bottles.',
          'Label samples with equipment ID, lubricant brand/grade, and operating observations.',
        ],
      },
      {
        title: 'Physical & Chemical Laboratory Testing',
        description:
          'Evaluate core lubricant properties to determine oil degradation and remaining service life.',
        scopePoints: [
          'Measure kinematic viscosity at 40°C / 100°C and viscosity index.',
          'Test Total Acid Number (TAN), oxidation, and additive depletion indicators.',
          'Evaluate water content / moisture contamination levels.',
        ],
      },
      {
        title: 'Wear Metal & Contamination Diagnostics',
        description:
          'Quantify metallic wear debris and solid particulate contamination for early component fault detection.',
        scopePoints: [
          'Elemental wear metal spectroscopy (Fe, Cu, Cr, Pb, Sn, Al, Si, etc.).',
          'Particle count classification as per ISO 4406 cleanliness standards.',
          'Ferrous debris assessment for gear and rolling-element bearing wear.',
        ],
      },
      {
        title: 'Health Evaluation & Technical Reporting',
        description:
          'Deliver actionable lubricant health ratings and contamination control recommendations.',
        scopePoints: [
          'Classify each sample into Normal, Caution, or Critical condition bands.',
          'Correlate wear elements with specific internal machine components.',
          'Recommend filtration, top-up, oil change, or mechanical inspection actions.',
        ],
      },
    ]),
    deliverables: [
      'Laboratory oil analysis report for each sampled asset with trend comparisons.',
      'ISO 4406 cleanliness rating and wear metal interpretation summary.',
      'Actionable lubrication and filtration recommendations.',
    ],
    customerArrangements: [
      'Lubricant grade specification sheets and equipment sump details.',
      'Safe access to active sampling ports with assistance from plant technicians.',
      'Required site entry passes and work permits.',
    ],
    scopePoints: [],
    defaultPrice: 4500,
    unitType: 'Per Job',
  },
  {
    name: 'Fan & Blower Balancing',
    description:
      'On-site dynamic rotor balancing is performed to eliminate mass imbalance, lower bearing dynamic loads, and restore smooth, reliable operation of industrial fans and blowers.',
    stages: makeStages('bal', [
      {
        title: 'Pre-Balancing Vibration & Mechanical Audit',
        description:
          'Verify that vibration is dominated by rotor imbalance and confirm structural integrity before balancing.',
        scopePoints: [
          'Measure initial overall vibration amplitude and 1X phase angle across all bearings.',
          'Check for mechanical looseness, structural resonance, belt tension, or bearing damage.',
          'Inspect impeller cleanliness, blade buildup, and rotor integrity prior to weight addition.',
        ],
      },
      {
        title: 'Trial Weight & Influence Coefficient Run',
        description:
          'Determine rotor sensitivity and phase response through controlled trial weight placement.',
        scopePoints: [
          'Calculate safe trial weight mass and mounting radius for the rotor.',
          'Install trial weight at defined angular reference and record vibration/phase response.',
          'Compute exact correction weight magnitude and angular placement.',
        ],
      },
      {
        title: 'Single / Dual-Plane Dynamic Balancing',
        description:
          'Install permanent correction weights and perform trim balancing until ISO targets are achieved.',
        scopePoints: [
          'Secure permanent correction weights (welding or bolting per rotor design).',
          'Execute single-plane or dual-plane trim balancing iterations as needed.',
          'Reduce 1X vibration amplitude within ISO 1940 / ISO 21940 balance quality limits.',
        ],
      },
      {
        title: 'Final Verification & Balancing Report',
        description:
          'Document before-and-after performance across bearing locations for maintenance records.',
        scopePoints: [
          'Record final vibration readings and phase stability at full operating speed.',
          'Confirm smooth running and acceptable bearing temperatures.',
          'Submit comprehensive dynamic balancing report with before/after comparison data.',
        ],
      },
    ]),
    deliverables: [
      'On-site dynamic balancing report with before/after amplitude and phase plots.',
      'Record of final correction weights and angular positions.',
      'Post-balancing mechanical reliability observations.',
    ],
    customerArrangements: [
      'Impeller cleaning prior to balancing, welder/fitter manpower, and balancing weights.',
      'Multiple controlled start-stop cycles of the fan/blower as required during balancing.',
      'Safe work permits, LOTO support, and access to inspection doors / rotor.',
    ],
    scopePoints: [],
    defaultPrice: 18000,
    unitType: 'Per Job',
  },
  {
    name: 'Thermography',
    description:
      'Non-contact infrared thermography inspection identifies electrical hotspots, loose terminations, and mechanical thermal anomalies before unplanned outages or safety incidents occur.',
    stages: makeStages('thg', [
      {
        title: 'Inspection Planning & Safety Clearance',
        description:
          'Finalize electrical/mechanical asset list and establish safe panel opening protocols.',
        scopePoints: [
          'Review list of switchgear, MCCs, transformers, motors, and mechanical equipment.',
          'Coordinate authorized plant electrician support for panel door opening.',
          'Verify asset load conditions (minimum 40% rated load recommended for electrical scans).',
        ],
      },
      {
        title: 'Infrared Thermal Imaging Survey',
        description:
          'Capture calibrated radiometric thermal images and visual reference photographs of targeted assets.',
        scopePoints: [
          'Scan switchgear, busbars, breakers, cable terminations, fuses, and transformers.',
          'Inspect motor housings, bearing blocks, gearboxes, couplings, and process lines.',
          'Record ambient temperature, load current (where available), and emissivity settings.',
        ],
      },
      {
        title: 'Delta-T Severity Classification',
        description:
          'Analyze captured thermograms to quantify temperature rises and assign maintenance urgency.',
        scopePoints: [
          'Compare hot component temperatures against reference phases and ambient baseline.',
          'Classify thermal anomalies into Advisory, Intermediate, Serious, or Critical levels.',
          'Correlate thermal patterns with loose joints, overloaded circuits, or friction faults.',
        ],
      },
      {
        title: 'Thermography Report & Action Plan',
        description:
          'Deliver a visual thermal report enabling targeted shutdown maintenance.',
        scopePoints: [
          'Compile side-by-side infrared thermograms and daylight reference photos for each anomaly.',
          'Document exact panel/feeder location, peak temperature, and Delta-T reading.',
          'Provide prioritized corrective maintenance recommendations.',
        ],
      },
    ]),
    deliverables: [
      'Infrared thermography report with radiometric thermal & visual comparison images.',
      'Anomaly priority register categorized by Delta-T severity.',
      'Recommended corrective actions for electrical and mechanical maintenance teams.',
    ],
    customerArrangements: [
      'Authorized plant electrician to open electrical panels and verify circuit load.',
      'Asset list, electrical single-line diagram (if available), and safety clearances.',
      'Equipment operating under normal production load during thermal survey.',
    ],
    scopePoints: [],
    defaultPrice: 14000,
    unitType: 'Per Day',
  },
  {
    name: 'Troubleshooting',
    description:
      'Specialized machinery troubleshooting and Root Cause Analysis (RCA) is carried out to diagnose recurring vibration, resonance, or premature component failure issues.',
    stages: makeStages('trb', [
      {
        title: 'Fault History Review & Site Assessment',
        description:
          'Gather machine design data, failure history, and operational context for targeted diagnostics.',
        scopePoints: [
          'Review historical maintenance logs, bearing failure records, and process changes.',
          'Inspect machine installation, piping strain, foundation condition, and drive components.',
          'Define diagnostic test plan with plant maintenance and operations engineers.',
        ],
      },
      {
        title: 'Advanced Multi-Channel Field Diagnostics',
        description:
          'Execute specialized dynamic tests to isolate complex mechanical, electrical, or structural faults.',
        scopePoints: [
          'Perform high-resolution FFT spectrum, time waveform, and cross-channel phase analysis.',
          'Conduct impact (bump) tests to identify structural or rotor natural frequencies.',
          'Capture run-up / coast-down Bode or waterfall profiles where required.',
        ],
      },
      {
        title: 'Root Cause Evaluation & Correlation',
        description:
          'Synthesize field measurements with mechanical design and operating variables to confirm root cause.',
        scopePoints: [
          'Differentiate between resonance, misalignment, looseness, cavitation, or electrical faults.',
          'Validate suspected failure mechanisms with quantitative field evidence.',
          'Evaluate permanent engineering modifications vs. immediate operational mitigation.',
        ],
      },
      {
        title: 'RCA Technical Report & Engineering Action Plan',
        description:
          'Deliver a clear engineering roadmap to eliminate recurring failures permanently.',
        scopePoints: [
          'Present root cause findings backed by diagnostic plots and phase diagrams.',
          'Outline step-by-step corrective actions and acceptance criteria after repair.',
          'Debrief plant reliability and maintenance leadership on findings.',
        ],
      },
    ]),
    deliverables: [
      'Detailed Root Cause Analysis (RCA) technical report with diagnostic evidence.',
      'Phase, spectrum, and bump test / natural frequency analysis plots.',
      'Permanent engineering modification and corrective maintenance plan.',
    ],
    customerArrangements: [
      'Historical maintenance records, machine drawings, and failure background.',
      'Operational flexibility for controlled load variations or start-stop diagnostic tests.',
      'Site coordination with plant engineering and maintenance personnel.',
    ],
    scopePoints: [],
    defaultPrice: 20000,
    unitType: 'Per Day',
  },
];

// Keep flattened scopePoints populated for backwards compatibility
INITIAL_SERVICE_LIBRARY.forEach((svc) => {
  svc.scopePoints = svc.stages.flatMap((st) => st.scopePoints);
});

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
