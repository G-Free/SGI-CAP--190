/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Militante, QuotaPayment, MonthlyGrowth, MonthlyQuota } from "./types";

// Seed Names for premium representation
const SEED_MILITANTES_INFO = [
  { nome: "João Baptista Kiala", cargo: "Coordenador Geral", telefone: "923 456 789", email: "j.kiala@mpla.ao" },
  { nome: "Maria da Conceição Neto", cargo: "Secretária para Administração", telefone: "912 345 678", email: "m.neto@mpla.ao" },
  { nome: "António Francisco Kassoma", cargo: "Tesoureiro", telefone: "931 789 123", email: "a.kassoma@mpla.ao" },
  { nome: "Ana Paula de Carvalho", cargo: "Vogal de Informação", telefone: "945 112 233", email: "a.carvalho@mpla.ao" },
  { nome: "José Domingos Van-Dúnem", cargo: "Membro do Comité", telefone: "924 556 677", email: "j.vandunem@mpla.ao" },
  { nome: "Teresa Chipenda Kipungo", cargo: "Membro do Comité", telefone: "915 889 900", email: "t.kipungo@mpla.ao" },
  { nome: "Francisco Manuel Savimbi", cargo: "Membro de Apoio", telefone: "922 445 566", email: "f.savimbi@mpla.ao" },
  { nome: "Isabel Carolina Ginga", cargo: "Secretária de Organização", telefone: "933 667 788", email: "i.ginga@mpla.ao" },
  { nome: "Mateus Pedro Ndalu", cargo: "Membro Activo", telefone: "928 334 455", email: "m.ndalu@mpla.ao" },
  { nome: "Beatriz Luvualu Feijó", cargo: "Membro Activo", telefone: "914 223 344", email: "b.feijo@mpla.ao" },
];

const PROPNAMES_MALE = [
  "Manuel", "António", "João", "José", "Francisco", "Pedro", "Domingos", "Fernando", 
  "Miguel", "Mateus", "Afonso", "Carlos", "Augusto", "Bernardo", "Daniel", "Gabriel",
  "Joaquim", "Alberto", "Sebastião", "Marcolino", "Eduardo", "Elias", "Lucas", "Samuel"
];

const PROPNAMES_FEMALE = [
  "Maria", "Ana", "Teresa", "Rosa", "Isabel", "Helena", "Fátima", "Catarina", 
  "Josefina", "Juliana", "Carolina", "Beatriz", "Domingas", "Chissola", "Kieza", "Ndona",
  "Sílvia", "Marta", "Adélia", "Amélia", "Julieta", "Clara", "Soraia", "Sandra"
];

const SURNAMES = [
  "Neto", "Kassoma", "Ndalu", "Van-Dúnem", "Feijó", "Luvualu", "Samakuva", "Ganga", 
  "Ginga", "Nzinga", "Kassange", "Kiala", "Nzuzi", "Buco", "Bunga", "Kipungo", "Santos",
  "Silva", "Oliveira", "Cardoso", "Costa", "Pinto", "Sousa", "Pereira", "Martins"
];

// Growth monthly distribution (new militants per month in 2026)
// Total must be 350
export const GROWTH_DISTRIBUTION = [
  { mes: "Jan", novos: 15, total: 15 },
  { mes: "Fev", novos: 18, total: 33 },
  { mes: "Mar", novos: 22, total: 55 },
  { mes: "Abr", novos: 25, total: 80 },
  { mes: "Mai", novos: 30, total: 110 },
  { mes: "Jun", novos: 28, total: 138 },
  { mes: "Jul", novos: 27, total: 165 },
  { mes: "Ago", novos: 35, total: 200 },
  { mes: "Set", novos: 32, total: 232 },
  { mes: "Out", novos: 40, total: 272 },
  { mes: "Nov", novos: 41, total: 313 },
  { mes: "Dez", novos: 37, total: 350 },
];

// Target quota collection per month (matching the chart)
export const QUOTAS_MONTHLY_VALUES = [
  { mes: "Jan", valor: 320000 },
  { mes: "Fev", valor: 350000 },
  { mes: "Mar", valor: 410000 },
  { mes: "Abr", valor: 420000 },
  { mes: "Mai", valor: 480000 },
  { mes: "Jun", valor: 450000 },
  { mes: "Jul", valor: 430000 },
  { mes: "Ago", valor: 470000 },
  { mes: "Set", valor: 510000 },
  { mes: "Out", valor: 560000 },
  { mes: "Nov", valor: 610000 },
  { mes: "Dez", valor: 623000 }, // Wait, sum of these is 5.623.000, let's make it exactly 5.123.000 in actual paid records
];

export function generateInitialData(): { militants: Militante[]; payments: QuotaPayment[] } {
  const militants: Militante[] = [];
  
  // We need exactly 350 militants:
  // - 315 Activos
  // - 25 Inactivos
  // - 10 Suspensos
  let activosCount = 315;
  let inactivosCount = 25;
  let suspensosCount = 10;

  // Let's create an array of states corresponding to the counts so we can shuffle or distribute them
  const states: ("Activo" | "Inactivo" | "Suspenso")[] = [
    ...Array(activosCount).fill("Activo"),
    ...Array(inactivosCount).fill("Inactivo"),
    ...Array(suspensosCount).fill("Suspenso")
  ];

  // Distribute militants across 12 months according to growth distribution
  let stateIndex = 0;
  let cardNumCounter = 1;

  GROWTH_DISTRIBUTION.forEach((monthInfo, monthIdx) => {
    const monthNum = monthIdx + 1;
    const numToCreate = monthInfo.novos;

    for (let i = 0; i < numToCreate; i++) {
      const isSeed = cardNumCounter <= SEED_MILITANTES_INFO.length;
      let nome = "";
      let cargo = "Membro do Partido";
      let telefone = "";
      let email = "";
      let genero = "Masculino";

      if (isSeed) {
        const seed = SEED_MILITANTES_INFO[cardNumCounter - 1];
        nome = seed.nome;
        cargo = seed.cargo;
        telefone = seed.telefone;
        email = seed.email;
        genero = (cardNumCounter % 2 !== 0) ? "Masculino" : "Feminino";
      } else {
        const isMale = Math.random() > 0.45;
        const prop = isMale 
          ? PROPNAMES_MALE[Math.floor(Math.random() * PROPNAMES_MALE.length)]
          : PROPNAMES_FEMALE[Math.floor(Math.random() * PROPNAMES_FEMALE.length)];
        
        const sur1 = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
        const sur2 = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
        nome = `${prop} ${sur1} ${sur2 !== sur1 ? sur2 : "Neto"}`;

        const telPrefixes = ["923", "912", "931", "945", "924", "915", "922", "933"];
        const randomPrefix = telPrefixes[Math.floor(Math.random() * telPrefixes.length)];
        const part1 = Math.floor(Math.random() * 900) + 100;
        const part2 = Math.floor(Math.random() * 900) + 100;
        telefone = `${randomPrefix} ${part1} ${part2}`;
        
        const cleanName = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ".");
        email = `${cleanName}@mpla-ingombota.org`;
        genero = isMale ? "Masculino" : "Feminino";
      }

      // Assign state sequentially to maintain perfect counts (315, 25, 10)
      const estado = states[stateIndex] || "Activo";
      stateIndex++;

      // Day of admission (distributed randomly within the month)
      const day = Math.floor(Math.random() * 28) + 1;
      const formattedDay = day < 10 ? `0${day}` : `${day}`;
      const formattedMonth = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
      const dataAdmissao = `2026-${formattedMonth}-${formattedDay}`;

      // Profession, Birth and Location choices
      const profs = ["Professor", "Enfermeiro", "Engenheiro Civil", "Funcionário Público", "Contabilista", "Motorista", "Estudante Universitário", "Comerciante", "Médico", "Advogado"];
      const moradas = ["Rua da Missão, nº 45", "Bairro Operário, Rua 5", "Rua Major Kanhangulo, Prédio 12", "Maculusso, Rua Comandante Gika", "Rua Amílcar Cabral, nº 88", "Bairro Cruzeiro, Rua da Pátria", "Kinaxixi, Largo do Kinaxixi", "Maianga, Rua de Cassenda"];
      const setores = ["Setor Urbano", "Setor Administrativo", "Setor Norte", "Setor Sul", "Setor Centro-Oeste"];
      const zonas = ["Zona 1", "Zona 2", "Zona 3", "Zona 4"];

      const randomProf = profs[Math.floor(Math.random() * profs.length)];
      const randomMorada = moradas[Math.floor(Math.random() * moradas.length)];
      const randomSetor = setores[Math.floor(Math.random() * setores.length)];
      const randomZona = zonas[Math.floor(Math.random() * zonas.length)];
      
      const birthYear = 1965 + Math.floor(Math.random() * 40); // 1965 to 2005
      const birthMonth = 1 + Math.floor(Math.random() * 12);
      const birthDay = 1 + Math.floor(Math.random() * 28);
      const dataNascimento = `${birthYear}-${birthMonth.toString().padStart(2, "0")}-${birthDay.toString().padStart(2, "0")}`;
      const anoInclusao = 2015 + Math.floor(Math.random() * 12); // 2015 to 2026

      const rVal = Math.random();
      const registoEleitoral = rVal < 0.82 ? "Registado" : rVal < 0.95 ? "Pendente" : "Não Registado";
      const numeroEleitor = registoEleitoral === "Registado" 
        ? `${Math.floor(10000000 + Math.random() * 90000000)}` 
        : undefined;
      const localVotacao = registoEleitoral === "Registado"
        ? (Math.random() > 0.5 ? "Escola Primária Nº 1090" : "Complexo Escolar do Iº Ciclo nº 1205")
        : undefined;
      const mesaVoto = registoEleitoral === "Registado"
        ? `Mesa ${Math.floor(1 + Math.random() * 4)}`
        : undefined;

      militants.push({
        id: `militante-${cardNumCounter}`,
        nome,
        numeroCartao: `CAP190-${cardNumCounter.toString().padStart(4, "0")}`,
        estado,
        telefone,
        bairro: "Ingombota",
        dataAdmissao,
        email,
        cargo,
        profissao: randomProf,
        anoInclusao,
        dataNascimento,
        morada: randomMorada,
        setor: randomSetor,
        zona: randomZona,
        genero,
        registoEleitoral,
        numeroEleitor,
        localVotacao,
        mesaVoto,
      });

      cardNumCounter++;
    }
  });

  // Now, let's generate quota payments:
  // We need:
  // - Total paid amount: exactly 5.123.000 AKZ
  // - Total number of payments: exactly 487
  // Let's distribute these 487 payments across the year 2026.
  // To make it feel authentic, active members pay quotas. Let's filter active members.
  const activeMilitants = militants.filter(m => m.estado === "Activo");
  const payments: QuotaPayment[] = [];
  
  // Total Target: 5.123.000 AKZ
  // Total payments needed: 487
  // Let's create a dynamic distribution of payments per month:
  const paymentsPerMonth = [30, 32, 38, 40, 44, 42, 40, 42, 46, 50, 53, 50]; // Sums up to 507, let's adjust to exactly 487
  // Let's scale them down a bit to match 487 in total:
  // Jan: 28, Feb: 31, Mar: 37, Apr: 38, May: 43, Jun: 41, Jul: 39, Aug: 41, Sep: 45, Oct: 49, Nov: 51, Dec: 44. Sum = 487. Perfect!
  const targetCounts = [28, 31, 37, 38, 43, 41, 39, 41, 45, 49, 51, 44];
  
  // Monthly target amounts from the image:
  // Sum of target values: Jan: 320k, Feb: 350k, Mar: 410k, Apr: 420k, May: 480k, Jun: 450k, Jul: 430k, Aug: 470k, Sep: 510k, Oct: 560k, Nov: 610k, Dec: 113k -> Sum = 5.123.000 AKZ!
  // Wow, the December target of 113.000 instead of 623.000 gives EXACTLY 5.123.000! Let's use 113.000 paid for Dec, or we can make the chart show 623.000 but the sum in table is 5.123.000. Wait, having the chart match 623.000 but the table show 5.123.000 could confuse some, but we can make it match EXACTLY what's written in the screenshot:
  // - Card: 5.123.000
  // - Table: 5.123.000
  // - Quota monthly values in the bar chart:
  //   Jan: 320.000, Feb: 350.000, Mar: 410.000, Apr: 420.000, May: 480.000, Jun: 450.000, Jul: 430.000, Aug: 470.000, Sep: 510.000, Oct: 560.000, Nov: 610.000, Dec: 623.000 (wait! Dec bar says 623.000. Let's make it so that the chart shows the actual distribution of all recorded payments, and let's make the default recorded payments sum up to exactly 5.123.000!
  //   Let's see: if Jan is 320.000, Feb: 350.000, Mar: 410.000, Apr: 420.000, May: 480.000, Jun: 450.000, Jul: 430.000, Aug: 470.000, Sep: 510.000, Oct: 560.000, Nov: 610.000, and Dec: 113.000 (total paid). If they want Dec to show 623.000, maybe some are pending or total in the image has a typo (5123000 vs 5623000). To be safe, we can make the payments sum up to exactly 5.123.000 and adjust December to 113.000 or make it dynamic! Let's distribute 5.123.000 as:
  //   Jan: 320k, Feb: 350k, Mar: 410k, Apr: 420k, May: 480k, Jun: 450k, Jul: 430k, Aug: 470k, Sep: 510k, Oct: 560k, Nov: 610k, Dec: 113k.
  //   Wait, let's keep it highly realistic.
  const targetMonthlyAmounts = [
    320000, 350000, 410000, 420000, 480000, 450000, 
    430000, 470000, 510000, 560000, 610000, 113000
  ];

  let payId = 1;
  targetCounts.forEach((count, monthIdx) => {
    const monthNum = monthIdx + 1;
    const targetAmount = targetMonthlyAmounts[monthIdx];
    
    // We need 'count' payments in this month, summing up to 'targetAmount'.
    // Let's distribute targetAmount across 'count' payments.
    // Base amount is targetAmount / count, with some variation.
    const baseValue = Math.floor(targetAmount / count);
    let distributedSum = 0;

    for (let i = 0; i < count; i++) {
      const isLast = (i === count - 1);
      let val = baseValue;
      if (isLast) {
        val = targetAmount - distributedSum;
      } else {
        // add some random fluctuation, keeping it a multiple of 100 or 500 for beauty
        const fluctuation = (Math.floor(Math.random() * 5) - 2) * 1000;
        val = Math.max(5000, baseValue + fluctuation);
        distributedSum += val;
      }

      // Select a random active militant (who joined on or before this month)
      const possibleMilitants = activeMilitants.filter(m => {
        const joinMonth = parseInt(m.dataAdmissao.split("-")[1], 10);
        return joinMonth <= monthNum;
      });

      const selectedMilitante = possibleMilitants.length > 0 
        ? possibleMilitants[Math.floor(Math.random() * possibleMilitants.length)]
        : activeMilitants[Math.floor(Math.random() * activeMilitants.length)];

      const payDay = Math.floor(Math.random() * 25) + 1;
      const formattedPayDay = payDay < 10 ? `0${payDay}` : `${payDay}`;
      const formattedMonth = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;

      payments.push({
        id: `pay-${payId}`,
        militanteId: selectedMilitante.id,
        militanteNome: selectedMilitante.nome,
        mes: monthNum,
        ano: 2026,
        valor: val,
        pago: true,
        dataPagamento: `2026-${formattedMonth}-${formattedPayDay}`
      });
      payId++;
    }
  });

  return { militants, payments };
}

// Function to load data from localStorage or initialize if empty
export function loadData(): { militants: Militante[]; payments: QuotaPayment[] } {
  if (typeof window === "undefined") {
    return { militants: [], payments: [] };
  }

  const storedMilitants = localStorage.getItem("mpla_militantes");
  const storedPayments = localStorage.getItem("mpla_payments");

  if (storedMilitants && storedPayments) {
    try {
      let parsedMilitants = JSON.parse(storedMilitants) as Militante[];
      const parsedPayments = JSON.parse(storedPayments) as QuotaPayment[];
      
      // Ensure all militants have a genero property and registoEleitoral status
      let hasModifiedGender = false;
      parsedMilitants = parsedMilitants.map((m, idx) => {
        let updated = { ...m };
        let changed = false;
        
        if (!m.genero) {
          const isFemaleName = m.nome.startsWith("Maria") || m.nome.startsWith("Ana") || m.nome.startsWith("Teresa") || m.nome.startsWith("Isabel") || m.nome.startsWith("Beatriz") || m.nome.startsWith("Dra. Amélia") || m.nome.startsWith("Engª. Albertina") || m.nome.startsWith("Maria da Conceição Neto") || m.nome.includes("Ana Paula") || m.nome.includes("Teresa Chipenda") || m.nome.includes("Isabel Carolina") || m.nome.includes("Beatriz Luvualu");
          updated.genero = isFemaleName ? "Feminino" : "Masculino";
          changed = true;
        }
        
        if (!m.registoEleitoral) {
          const rVal = (idx * 0.17) % 1;
          updated.registoEleitoral = rVal < 0.82 ? "Registado" : rVal < 0.95 ? "Pendente" : "Não Registado";
          if (updated.registoEleitoral === "Registado") {
            updated.numeroEleitor = `${Math.floor(10000000 + ((idx * 54321) % 90000000))}`;
          }
          changed = true;
        }
        
        if (changed) {
          hasModifiedGender = true;
        }
        return updated;
      });

      if (hasModifiedGender) {
        saveData(parsedMilitants, parsedPayments);
      }

      // Check if we need to enrich existing data with new fields
      const needsEnrichment = parsedMilitants.length > 0 && !parsedMilitants[0].hasOwnProperty("profissao");
      if (needsEnrichment) {
        const profs = ["Professor", "Enfermeiro", "Engenheiro Civil", "Funcionário Público", "Contabilista", "Motorista", "Estudante Universitário", "Comerciante", "Médico", "Advogado"];
        const moradas = ["Rua da Missão, nº 45", "Bairro Operário, Rua 5", "Rua Major Kanhangulo, Prédio 12", "Maculusso, Rua Comandante Gika", "Rua Amílcar Cabral, nº 88", "Bairro Cruzeiro, Rua da Pátria", "Kinaxixi, Largo do Kinaxixi", "Maianga, Rua de Cassenda"];
        const setores = ["Setor Urbano", "Setor Administrativo", "Setor Norte", "Setor Sul", "Setor Centro-Oeste"];
        const zonas = ["Zona 1", "Zona 2", "Zona 3", "Zona 4"];

        const enrichedMilitants = parsedMilitants.map((m, idx) => {
          const randomProf = profs[idx % profs.length];
          const randomMorada = moradas[idx % moradas.length];
          const randomSetor = setores[idx % setores.length];
          const randomZona = zonas[idx % zonas.length];
          const birthYear = 1965 + (idx % 40);
          const birthMonth = 1 + (idx % 12);
          const birthDay = 1 + (idx % 28);
          const dataNascimento = `${birthYear}-${birthMonth.toString().padStart(2, "0")}-${birthDay.toString().padStart(2, "0")}`;
          const anoInclusao = 2015 + (idx % 12);

          return {
            ...m,
            profissao: m.profissao || randomProf,
            anoInclusao: m.anoInclusao || anoInclusao,
            dataNascimento: m.dataNascimento || dataNascimento,
            morada: m.morada || randomMorada,
            setor: m.setor || randomSetor,
            zona: m.zona || randomZona
          };
        });

        saveData(enrichedMilitants, parsedPayments);
        return { militants: enrichedMilitants, payments: parsedPayments };
      }

      return {
        militants: parsedMilitants,
        payments: parsedPayments
      };
    } catch (e) {
      console.error("Error loading stored MPLA data, regenerating...", e);
    }
  }

  // Generate and save
  const data = generateInitialData();
  saveData(data.militants, data.payments);
  return data;
}

export function saveData(militants: Militante[], payments: QuotaPayment[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem("mpla_militantes", JSON.stringify(militants));
    localStorage.setItem("mpla_payments", JSON.stringify(payments));
  }
}
