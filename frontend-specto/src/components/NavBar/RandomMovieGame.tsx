import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RandomMovieGame.css";
import { buildApiUrl } from "@/utils/api";

type RandomMovieGameProps = {
  isOpen: boolean;
  onClose: () => void;
};

type QuestionOption = {
  value: string;
  label: string;
  helper: string;
};

type Question = {
  id: "genre" | "vibe" | "period";
  title: string;
  helper: string;
  options: QuestionOption[];
};

type MovieSuggestion = {
  id: number;
  title: string;
  genre: string;
  vibe: string;
  period: string;
  description: string;
  highlight: string;
  poster: string;
};

type GenreOption = "acao" | "comedia" | "drama" | "ficcao" | "terror" | "animacao";
type VibeOption = "intenso" | "leve" | "emocionante" | "misterioso" | "divertido";
type PeriodOption = "novo" | "classico" | "retro";

type ApiMovie = {
  id: number;
  titulo?: string | null;
  titulo_original?: string | null;
  sinopse?: string | null;
  poster?: string | null;
  generos_ids?: number[];
  data_lancamento?: string | null;
  nota?: number | null;
};

const QUESTIONS: Question[] = [
  {
    id: "genre",
    title: "Que género combina contigo hoje?",
    helper: "Escolhe o tipo de história que te apetece explorar.",
    options: [
      { value: "acao", label: "Ação & Aventura", helper: "Adrenalina e explosões" },
      { value: "comedia", label: "Comédia", helper: "Rir até doer a barriga" },
      { value: "drama", label: "Drama", helper: "Emoções fortes" },
      { value: "ficcao", label: "Ficção Científica", helper: "Outros mundos e futuros" },
      { value: "terror", label: "Terror", helper: "Medo delicioso" },
      { value: "animacao", label: "Animação", helper: "Magia para todas as idades" },
    ],
  },
  {
    id: "vibe",
    title: "Qual o mood da sessão?",
    helper: "Isto ajuda a afinar o tom do filme.",
    options: [
      { value: "intenso", label: "Intenso", helper: "Sequências épicas" },
      { value: "leve", label: "Leve e descontraído", helper: "Boa vibe com pipocas" },
      { value: "emocionante", label: "Emocionante", helper: "Prepara os lenços" },
      { value: "misterioso", label: "Misterioso", helper: "Plot twists e suspense" },
      { value: "divertido", label: "Cheio de humor", helper: "Energia positiva" },
    ],
  },
  {
    id: "period",
    title: "Preferes algo mais recente ou clássico?",
    helper: "Os grandes filmes aparecem em todas as eras.",
    options: [
      { value: "novo", label: "Lançamentos recentes", helper: "Ideias frescas" },
      { value: "classico", label: "Clássicos modernos", helper: "2000s e 2010s" },
      { value: "retro", label: "Retro vibes", helper: "Antes dos anos 2000" },
    ],
  },
];

const posterPlaceholder = "https://via.placeholder.com/500x750?text=Sem+Imagem";

const FALLBACK_LIBRARY: Record<GenreOption, Record<PeriodOption, Record<VibeOption, Omit<MovieSuggestion, "genre" | "vibe" | "period">>>> = {
  acao: {
    novo: {
      intenso: {
        id: 361743,
        title: "Top Gun: Maverick",
        description: "Maverick regressa para treinar pilotos e enfrentar a missão mais arriscada da carreira.",
        highlight: "Adrenalina a jato e nostalgia bem doseada.",
        poster: "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
      },
      leve: {
        id: 550988,
        title: "Free Guy",
        description: "Um NPC decide ser herói do próprio videojogo e espalha bom humor.",
        highlight: "Comédia leve cheia de easter eggs e ação colorida.",
        poster: "https://image.tmdb.org/t/p/w500/9aotxauvgz6bFQg0Utem0qvELs9.jpg",
      },
      emocionante: {
        id: 566525,
        title: "Shang-Chi and the Legend of the Ten Rings",
        description: "O mestre das dez argolas confronta o passado para salvar a família.",
        highlight: "Artes marciais coreografadas e fantasia familiar.",
        poster: "https://image.tmdb.org/t/p/w500/1BIoJGKbXjdFDAqUEiA2VHqkK1Z.jpg",
      },
      misterioso: {
        id: 577922,
        title: "Tenet",
        description: "Um agente manipula o tempo para travar o apocalipse.",
        highlight: "Thriller intrincado repleto de quebra-cabeças temporais.",
        poster: "https://image.tmdb.org/t/p/w500/k68nPLbIST6NP96JmTxmZijEvCA.jpg",
      },
      divertido: {
        id: 752623,
        title: "The Lost City",
        description: "Autora e modelo vivem uma aventura tropical cheia de trapalhadas.",
        highlight: "Química improvável, ação e gargalhadas.",
        poster: "https://image.tmdb.org/t/p/w500/neMZH82Stu91d3iqvLdNQfqPPyl.jpg",
      },
    },
    classico: {
      intenso: {
        id: 155,
        title: "The Dark Knight",
        description: "Batman enfrenta o caos absoluto do Joker em Gotham.",
        highlight: "Clássico moderno com ação tensa e vilão icónico.",
        poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
      },
      leve: {
        id: 207703,
        title: "Kingsman: The Secret Service",
        description: "Galã britânico aprende etiqueta e gadgets explosivos.",
        highlight: "Espionagem estilosa com humor sarcástico.",
        poster: "https://image.tmdb.org/t/p/w500/ay7xwXn1G9fzX9TUBlkGA584rGi.jpg",
      },
      emocionante: {
        id: 19995,
        title: "Avatar",
        description: "Jake Sully mergulha em Pandora e precisa escolher um lado.",
        highlight: "Fantasia épica visualmente revolucionária.",
        poster: "https://image.tmdb.org/t/p/w500/jRXYjXNq0Cs2TcJjLkki24MLp7u.jpg",
      },
      misterioso: {
        id: 27205,
        title: "Inception",
        description: "Uma equipa rouba segredos infiltrando sonhos em múltiplos níveis.",
        highlight: "Mistério labiríntico com cenas de gravidade zero.",
        poster: "https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg",
      },
      divertido: {
        id: 22,
        title: "Pirates of the Caribbean",
        description: "Jack Sparrow arma planos absurdos para recuperar o Pérola Negra.",
        highlight: "Aventura clássica com humor pirata irresistível.",
        poster: "https://image.tmdb.org/t/p/w500/waFr5RVKaQ9dzOt3nQuIVB1FiPu.jpg",
      },
    },
    retro: {
      intenso: {
        id: 280,
        title: "Terminator 2: Judgment Day",
        description: "Sarah Connor enfrenta de novo os exterminadores para salvar o futuro.",
        highlight: "Efeitos práticos lendários e perseguições brutais.",
        poster: "https://image.tmdb.org/t/p/w500/5M0j0B18abtBI5gi2RhfjjurTqb.jpg",
      },
      leve: {
        id: 2109,
        title: "Rush Hour",
        description: "Parceiros improváveis resolvem crimes entre piadas e pancadaria.",
        highlight: "Dupla Jackie Chan + Chris Tucker em modo turbo.",
        poster: "https://image.tmdb.org/t/p/w500/we7wOLVFgxhzLzUt0qNe50xdIQZ.jpg",
      },
      emocionante: {
        id: 89,
        title: "Indiana Jones and the Last Crusade",
        description: "Pai e filho procuram o Santo Graal fugindo dos nazis.",
        highlight: "Aventura clássica cheia de charme.",
        poster: "https://image.tmdb.org/t/p/w500/4p1N2Qrt8j0H8xMHMHvtRxv9weZ.jpg",
      },
      misterioso: {
        id: 5503,
        title: "The Fugitive",
        description: "Um médico inocente foge para provar que não matou a esposa.",
        highlight: "Thriller com perseguições memoráveis.",
        poster: "https://image.tmdb.org/t/p/w500/e6FjU6aX7WwxUFWlYJ65dVSFV2a.jpg",
      },
      divertido: {
        id: 607,
        title: "Men in Black",
        description: "Agentes secretos lidam com alienígenas travessos em Nova Iorque.",
        highlight: "Sci-fi e comédia em sintonia noventista.",
        poster: "https://image.tmdb.org/t/p/w500/uLOmOF5IzWoyrgIF5MfUnh5pa1X.jpg",
      },
    },
  },
  comedia: {
    novo: {
      intenso: {
        id: 718930,
        title: "Bullet Train",
        description: "Assassinos profissionais cruzam-se num comboio japonês cheio de golpes.",
        highlight: "Humor ácido misturado com coreografias rápidas.",
        poster: "https://image.tmdb.org/t/p/w500/tVxDe01Zy3kZqaZRNiXFGDICdZk.jpg",
      },
      leve: {
        id: 613504,
        title: "Palm Springs",
        description: "Um casamento infinito em loop temporal vira terapia romântica.",
        highlight: "Rom-com sci-fi espirituosa e calorosa.",
        poster: "https://image.tmdb.org/t/p/w500/yf5IuMw16cDT6BmE8OlP4GeID3U.jpg",
      },
      emocionante: {
        id: 497582,
        title: "The Farewell",
        description: "Família chinesa cria falso casamento para despedir-se da avó.",
        highlight: "Dramédia sensível entre saudade e risos.",
        poster: "https://image.tmdb.org/t/p/w500/ivc0Jss60b8j4pUog6DiLq4bZZF.jpg",
      },
      misterioso: {
        id: 661374,
        title: "Glass Onion",
        description: "Benoit Blanc investiga um crime durante retiro tecnológico.",
        highlight: "Mistério com sátira e elenco afiado.",
        poster: "https://image.tmdb.org/t/p/w500/vDGr1YdrlfbU9wxTOdpf3zChmv9.jpg",
      },
      divertido: {
        id: 850871,
        title: "No Hard Feelings",
        description: "Uma mulher aceita ajudar um adolescente tímido a socializar antes da faculdade.",
        highlight: "Comédia atrevida com timing perfeito de Jennifer Lawrence.",
        poster: "https://image.tmdb.org/t/p/w500/4W8ka0vlJzGGWnQve8RK3EaS3H1.jpg",
      },
    },
    classico: {
      intenso: {
        id: 7446,
        title: "Tropic Thunder",
        description: "Filmagem caótica coloca atores mimados em guerra real.",
        highlight: "Sátira hollywoodiana sem filtros.",
        poster: "https://image.tmdb.org/t/p/w500/dvOj3ZMIqFZvxO55wZ8kfdZMHG9.jpg",
      },
      leve: {
        id: 455207,
        title: "Crazy Rich Asians",
        description: "Professora descobre ser alvo dos holofotes da elite de Singapura.",
        highlight: "Romance cintilante com humor sofisticado.",
        poster: "https://image.tmdb.org/t/p/w500/1XxL4LJ5WHdrcYcihEZUCgNCpAW.jpg",
      },
      emocionante: {
        id: 109445,
        title: "About Time",
        description: "Tim usa viagens temporais para viver um grande amor sem perder a família.",
        highlight: "Conforto emocional cheio de risos.",
        poster: "https://image.tmdb.org/t/p/w500/4GpyYVHzpq1OkF0XPjMXaIB52DL.jpg",
      },
      misterioso: {
        id: 1771,
        title: "Kiss Kiss Bang Bang",
        description: "Ladrão acidental transforma-se em astro e detetive improvável.",
        highlight: "Noir moderno recheado de sarcasmo.",
        poster: "https://image.tmdb.org/t/p/w500/h3Xa2qHBCHkFnI28HMKcCIFP6oT.jpg",
      },
      divertido: {
        id: 8363,
        title: "Superbad",
        description: "Dois amigos planeiam a derradeira festa antes da universidade.",
        highlight: "Humor juvenil icónico e coração enorme.",
        poster: "https://image.tmdb.org/t/p/w500/ek8e8txUyUwd2BNqj6lFEerJfbq.jpg",
      },
    },
    retro: {
      intenso: {
        id: 90,
        title: "Beverly Hills Cop",
        description: "Axel Foley leva o caos de Detroit para investigar crimes na Califórnia.",
        highlight: "Eddie Murphy no auge da energia.",
        poster: "https://image.tmdb.org/t/p/w500/labei8NC8C9KiAovCZXqBdrF6KM.jpg",
      },
      leve: {
        id: 860,
        title: "Ferris Bueller's Day Off",
        description: "O adolescente mais carismático de Chicago mata aula para viver um dia épico.",
        highlight: "Vibe positiva inesquecível dos anos 80.",
        poster: "https://image.tmdb.org/t/p/w500/9x6wxKcG3bi2uWb5QSZ8K9IESkb.jpg",
      },
      emocionante: {
        id: 788,
        title: "Mrs. Doubtfire",
        description: "Pai divorciado cria alter ego para ficar perto dos filhos.",
        highlight: "Robin Williams alterna gargalhadas e ternura.",
        poster: "https://image.tmdb.org/t/p/w500/pWfSiQEpVtK9zj1zR2nV6V4Tyob.jpg",
      },
      misterioso: {
        id: 9329,
        title: "Clue",
        description: "Jantar peculiar transforma jogo de tabuleiro em crime real.",
        highlight: "Mistério deliciosamente teatral e bem-humorado.",
        poster: "https://image.tmdb.org/t/p/w500/puYqGKyL0tDfw0YbF6HWw35vj0s.jpg",
      },
      divertido: {
        id: 3049,
        title: "Ace Ventura: Pet Detective",
        description: "Detetive especializado em animais encara o caso mais absurdo.",
        highlight: "Jim Carrey no modo pastelão máximo.",
        poster: "https://image.tmdb.org/t/p/w500/oQYv5KkS2T6nCGYfawuOsg9uVgU.jpg",
      },
    },
  },
  drama: {
    novo: {
      intenso: {
        id: 872585,
        title: "Oppenheimer",
        description: "A mente por trás da bomba atómica enfrenta as consequências do próprio legado.",
        highlight: "Drama histórico vibrante e claustrofóbico.",
        poster: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2Bi.jpg",
      },
      leve: {
        id: 840430,
        title: "The Holdovers",
        description: "Professor rabugento e aluno rebelde ficam juntos no Natal dos anos 70.",
        highlight: "Humor agridoce cheio de humanidade.",
        poster: "https://image.tmdb.org/t/p/w500/xwK2BZn8hAWhclw0Vb4vZzK0mJy.jpg",
      },
      emocionante: {
        id: 666277,
        title: "Past Lives",
        description: "Infâncias cruzadas em Seul reencontram-se em Nova Iorque.",
        highlight: "Romance contemplativo sobre destino e escolhas.",
        poster: "https://image.tmdb.org/t/p/w500/kpPSB8t3rS0wGfQifX2IyEZ5S1C.jpg",
      },
      misterioso: {
        id: 674324,
        title: "The Banshees of Inisherin",
        description: "Uma amizade termina sem motivo aparente e desencadeia atitudes extremas.",
        highlight: "Humor negro e suspense emocional no interior da Irlanda.",
        poster: "https://image.tmdb.org/t/p/w500/4yFG6cSPaCaPhyJ1vtGOtMD1lgh.jpg",
      },
      divertido: {
        id: 542178,
        title: "The French Dispatch",
        description: "Uma redação americana em França publica histórias excêntricas.",
        highlight: "Antologia estilosa repleta de absurdos elegantes.",
        poster: "https://image.tmdb.org/t/p/w500/ntMOnJA2EU2kfmgEsebsoaYj9vd.jpg",
      },
    },
    classico: {
      intenso: {
        id: 244786,
        title: "Whiplash",
        description: "Baterista ambicioso enfrenta um maestro sádico.",
        highlight: "Tensão constante e performances arrepiantes.",
        poster: "https://image.tmdb.org/t/p/w500/lIv1QinFqz4dlp5U4lQ6HaiskOZ.jpg",
      },
      leve: {
        id: 77338,
        title: "The Intouchables",
        description: "Aristocrata tetraplégico encontra amizade improvável no cuidador.",
        highlight: "Dramédia francesa inspiradora.",
        poster: "https://image.tmdb.org/t/p/w500/1QU7HKbsHpKJnFMRLszqxctetuj.jpg",
      },
      emocionante: {
        id: 1402,
        title: "The Pursuit of Happyness",
        description: "Pai solteiro luta contra a pobreza para garantir um futuro ao filho.",
        highlight: "Will Smith entrega uma das interpretações mais tocantes.",
        poster: "https://image.tmdb.org/t/p/w500/bfz3xJuxbJG7ysP0BDcJZ0x2nns.jpg",
      },
      misterioso: {
        id: 1949,
        title: "Zodiac",
        description: "Investigadores obcecados perseguem o serial killer de São Francisco.",
        highlight: "Investigação meticulosa cheia de paranoia.",
        poster: "https://image.tmdb.org/t/p/w500/rk9hGGbi8u5ts8XQX4IJcfsrNYz.jpg",
      },
      divertido: {
        id: 2275,
        title: "Juno",
        description: "Adolescente irreverente enfrenta a maternidade com sarcasmo e ternura.",
        highlight: "Roteiro espirituoso e cheio de coração.",
        poster: "https://image.tmdb.org/t/p/w500/e1vH4POUS1JptJobeOv2tj3TcYd.jpg",
      },
    },
    retro: {
      intenso: {
        id: 424,
        title: "Schindler's List",
        description: "Industrial alemão arrisca tudo para salvar judeus durante o Holocausto.",
        highlight: "Drama poderoso e obrigatório.",
        poster: "https://image.tmdb.org/t/p/w500/c8Ass7acuOe4za6DhSattE359gr.jpg",
      },
      leve: {
        id: 11216,
        title: "Cinema Paradiso",
        description: "Um cineasta recorda a infância e a amizade com o projecionista local.",
        highlight: "Carta de amor ao cinema cheia de nostalgia.",
        poster: "https://image.tmdb.org/t/p/w500/ttJrZtN0epN0n21MDGgUfkT2C5c.jpg",
      },
      emocionante: {
        id: 13,
        title: "Forrest Gump",
        description: "Homem simples atravessa décadas da história americana com inocência.",
        highlight: "Clássico sobre perseverança e amor.",
        poster: "https://image.tmdb.org/t/p/w500/saHP97rTPS5eLmrLQEcANmKrsFl.jpg",
      },
      misterioso: {
        id: 745,
        title: "The Sixth Sense",
        description: "Criança que vê mortos desafia um psicólogo a acreditar no impossível.",
        highlight: "Plot twist icónico do cinema.",
        poster: "https://image.tmdb.org/t/p/w500/fIssD3w3SvIhPPmVo4WMgZDVLnx.jpg",
      },
      divertido: {
        id: 137,
        title: "Groundhog Day",
        description: "Meteorologista preso num loop aprende a viver e amar.",
        highlight: "Fábula romântica espirituosa dos anos 90.",
        poster: "https://image.tmdb.org/t/p/w500/gCgt1WARPZaXnq523ySQEUKinCs.jpg",
      },
    },
  },
  ficcao: {
    novo: {
      intenso: {
        id: 438631,
        title: "Duna",
        description: "Paul Atreides mergulha nos segredos de Arrakis para salvar a família.",
        highlight: "Sci-fi épico e contemplativo.",
        poster: "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
      },
      leve: {
        id: 696806,
        title: "The Adam Project",
        description: "Piloto viaja no tempo e encontra o próprio eu adolescente.",
        highlight: "Aventura familiar com viagens temporais bem-humoradas.",
        poster: "https://image.tmdb.org/t/p/w500/wFjboE0aFZNbVOF05fzrka9Fqyx.jpg",
      },
      emocionante: {
        id: 670292,
        title: "The Creator",
        description: "Soldado descobre uma criança androide capaz de terminar uma guerra.",
        highlight: "Sci-fi emotivo sobre humanidade e IA.",
        poster: "https://image.tmdb.org/t/p/w500/vBZ0qvaRxqEhZwl6LWmruJqWE8Z.jpg",
      },
      misterioso: {
        id: 556984,
        title: "Reminiscence",
        description: "Detetive de memórias mergulha no passado para encontrar um amor desaparecido.",
        highlight: "Neo-noir futurista melancólico.",
        poster: "https://image.tmdb.org/t/p/w500/8BfPqVK0v0vhO4R6Xs3Hq0ITt5h.jpg",
      },
      divertido: {
        id: 581644,
        title: "Space Sweepers",
        description: "Tripulação de sucateiros espaciais encontra androide procurada.",
        highlight: "Sci-fi coreano cheio de humor e coração.",
        poster: "https://image.tmdb.org/t/p/w500/kyX79P9M4U3E0YbJ3bagwLPPZ9s.jpg",
      },
    },
    classico: {
      intenso: {
        id: 137113,
        title: "Edge of Tomorrow",
        description: "Soldado revive o mesmo dia até dominar os invasores alienígenas.",
        highlight: "Loop temporal explosivo com Tom Cruise e Emily Blunt.",
        poster: "https://image.tmdb.org/t/p/w500/uUHvlkLavotfGsNtosDy8ShsIYF.jpg",
      },
      leve: {
        id: 7454,
        title: "The Hitchhiker's Guide to the Galaxy",
        description: "Arthur Dent viaja pelo cosmos após a destruição da Terra.",
        highlight: "Absurdos britânicos em escala espacial.",
        poster: "https://image.tmdb.org/t/p/w500/fNVGvN6zkRgZNpmjDoE7THTCPeL.jpg",
      },
      emocionante: {
        id: 157336,
        title: "Interstellar",
        description: "Astronautas atravessam buracos negros para salvar a humanidade.",
        highlight: "Drama familiar embalado por ciência e emoção.",
        poster: "https://image.tmdb.org/t/p/w500/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg",
      },
      misterioso: {
        id: 264660,
        title: "Ex Machina",
        description: "Programador testa a consciência de uma IA em retiro isolado.",
        highlight: "Thriller elegante sobre ética tecnológica.",
        poster: "https://image.tmdb.org/t/p/w500/btbRB7BrD887j5NrvjxceRDmaot.jpg",
      },
      divertido: {
        id: 118340,
        title: "Guardians of the Galaxy",
        description: "Desajustados intergalácticos unem forças ao som de mixtapes clássicas.",
        highlight: "Espaço colorido com muito humor e ritmo.",
        poster: "https://image.tmdb.org/t/p/w500/r7vmZjiyZw9rpJMQJdXpjgiCOk9.jpg",
      },
    },
    retro: {
      intenso: {
        id: 603,
        title: "The Matrix",
        description: "Neo descobre que vive numa simulação e lidera a resistência.",
        highlight: "Revolução sci-fi cheia de filosofia e ação.",
        poster: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
      },
      leve: {
        id: 105,
        title: "Back to the Future",
        description: "Marty McFly precisa corrigir a linha temporal antes de desaparecer.",
        highlight: "Viagem temporal cheia de charme oitentista.",
        poster: "https://image.tmdb.org/t/p/w500/pTpxQB1N0waaSc3OSn0e9oc8kx9.jpg",
      },
      emocionante: {
        id: 601,
        title: "E.T. the Extra-Terrestrial",
        description: "Rapaz ajuda um extraterrestre a regressar a casa.",
        highlight: "Fantasia doce e intemporal de Spielberg.",
        poster: "https://image.tmdb.org/t/p/w500/2Wgy7qZcxs58EcrzGPDJq3sV0Yj.jpg",
      },
      misterioso: {
        id: 62,
        title: "2001: A Space Odyssey",
        description: "Humanidade enfrenta um monólito e uma IA enigmática no espaço profundo.",
        highlight: "Filosofia e visual deslumbrante.",
        poster: "https://image.tmdb.org/t/p/w500/zmmYdPa8Lxx999Af9vnVP4XQ1V6.jpg",
      },
      divertido: {
        id: 9350,
        title: "Honey, I Shrunk the Kids",
        description: "Cientista encolhe acidentalmente as crianças, que enfrentam perigos no quintal.",
        highlight: "Aventura familiar criativa cheia de efeitos práticos.",
        poster: "https://image.tmdb.org/t/p/w500/a3YyV0RXKu70bnv9LBeMxZIJKVd.jpg",
      },
    },
  },
  terror: {
    novo: {
      intenso: {
        id: 520763,
        title: "A Quiet Place Part II",
        description: "Família Abbott continua a luta silenciosa contra criaturas sensíveis ao som.",
        highlight: "Suspense constante e emocional.",
        poster: "https://image.tmdb.org/t/p/w500/4q2hz2m8hubgvijz8Ez0T2Os2Yv.jpg",
      },
      leve: {
        id: 632856,
        title: "Werewolves Within",
        description: "Povoado isolado precisa descobrir quem é o lobisomem.",
        highlight: "Terror/comédia com humor afiado.",
        poster: "https://image.tmdb.org/t/p/w500/kbn7j2l0twHiGwxslt8YwTdmPkw.jpg",
      },
      emocionante: {
        id: 572802,
        title: "Last Night in Soho",
        description: "Jovem estilista liga-se ao passado londrino em visões perigosas.",
        highlight: "Mistura estilosa de terror e drama psicológico.",
        poster: "https://image.tmdb.org/t/p/w500/Ase0jW5dVDt2SnZs7ba2XpDhmS5.jpg",
      },
      misterioso: {
        id: 565028,
        title: "The Night House",
        description: "Uma viúva descobre segredos obscuros na casa à beira do lago.",
        highlight: "Atmosfera arrepiante cheia de reviravoltas.",
        poster: "https://image.tmdb.org/t/p/w500/xLuOUDk7chk0tvesw8EbqINc34U.jpg",
      },
      divertido: {
        id: 1071215,
        title: "Totally Killer",
        description: "Adolescente viaja para 1987 para impedir um assassino mascarado.",
        highlight: "Slasher com humor meta e vibe oitentista.",
        poster: "https://image.tmdb.org/t/p/w500/52xKHEUhzQ5BJeoJQsidEAmox0C.jpg",
      },
    },
    classico: {
      intenso: {
        id: 493922,
        title: "Hereditary",
        description: "Segredos familiares despertam forças demoníacas.",
        highlight: "Terror psicológico perturbador.",
        poster: "https://image.tmdb.org/t/p/w500/lHV8HHlhwNup2VbpiACtlKzaGIQ.jpg",
      },
      leve: {
        id: 19908,
        title: "Zombieland",
        description: "Grupo improvável sobrevive ao apocalipse zombie com regras e piadas.",
        highlight: "Terror e comédia em ritmo videogame.",
        poster: "https://image.tmdb.org/t/p/w500/dPa5xvHQ6tq1cL9MoDrePiHRY2n.jpg",
      },
      emocionante: {
        id: 1933,
        title: "The Others",
        description: "Mãe isolada numa mansão passa a acreditar que não está sozinha.",
        highlight: "Fantasma gótico cheio de melancolia.",
        poster: "https://image.tmdb.org/t/p/w500/fRaTWlNsBkwGffzRW73hAGL6J7M.jpg",
      },
      misterioso: {
        id: 565,
        title: "The Ring",
        description: "Vídeo amaldiçoado mata quem o assiste em sete dias.",
        highlight: "Investigação sinistra e atmosfera gelada.",
        poster: "https://image.tmdb.org/t/p/w500/b9mBf049Vu2V2k9pJd0t2hX7GLo.jpg",
      },
      divertido: {
        id: 246741,
        title: "What We Do in the Shadows",
        description: "Documentário fictício acompanha vampiros flatmates em Wellington.",
        highlight: "Humor seco e muita referência pop.",
        poster: "https://image.tmdb.org/t/p/w500/z3nyR0q5P1Qv4bDS7xo0GX8C8Mu.jpg",
      },
    },
    retro: {
      intenso: {
        id: 948,
        title: "The Exorcist",
        description: "Menina possuída testa a fé de dois padres.",
        highlight: "O clássico definitivo do horror.",
        poster: "https://image.tmdb.org/t/p/w500/5xUHSXoTXE3dIFXyKHRtNnuB3BW.jpg",
      },
      leve: {
        id: 4011,
        title: "Beetlejuice",
        description: "Fantasma excêntrico é contratado para expulsar vivos indesejados.",
        highlight: "Gótico pastelão comandado por Tim Burton.",
        poster: "https://image.tmdb.org/t/p/w500/nnl6OWkyPpuMm595hmAxNW3rZFn.jpg",
      },
      emocionante: {
        id: 609,
        title: "Poltergeist",
        description: "Família suburbana luta para recuperar a filha raptada por espíritos.",
        highlight: "Sustos icónicos dos anos 80.",
        poster: "https://image.tmdb.org/t/p/w500/3JjCe9mCvk03PbczvQF9uxW6lZ8.jpg",
      },
      misterioso: {
        id: 377,
        title: "A Nightmare on Elm Street",
        description: "Freddy Krueger ataca adolescentes durante os sonhos.",
        highlight: "Criatividade macabra e atmosfera onírica.",
        poster: "https://image.tmdb.org/t/p/w500/wGTUf118ArNpyFESNUcUOeYzS4F.jpg",
      },
      divertido: {
        id: 9273,
        title: "Gremlins",
        description: "Criaturas fofas transformam o Natal num caos hilário.",
        highlight: "Mistura deliciosa de terror e comédia familiar.",
        poster: "https://image.tmdb.org/t/p/w500/w5ILvihCfbvZ3xJfFgRc9GID4Ke.jpg",
      },
    },
  },
  animacao: {
    novo: {
      intenso: {
        id: 569094,
        title: "Spider-Man: Across the Spider-Verse",
        description: "Miles Morales mergulha em universos paralelos e enfrenta a Sociedade Aranha.",
        highlight: "Animação revolucionária e ação vertiginosa.",
        poster: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
      },
      leve: {
        id: 508943,
        title: "Luca",
        description: "Dois monstros marinhos viram humanos para viver um verão italiano.",
        highlight: "Amizade doce e sabores mediterrânicos.",
        poster: "https://image.tmdb.org/t/p/w500/jTswp6KyDYKtvC52GbHagrZbGvD.jpg",
      },
      emocionante: {
        id: 508442,
        title: "Soul",
        description: "Professor de música procura o significado da vida ao entrar no além.",
        highlight: "Reflexão sensível com jazz e imaginação.",
        poster: "https://image.tmdb.org/t/p/w500/kf456ZqeC45XTvo6W9pW5clYKfQ.jpg",
      },
      misterioso: {
        id: 916224,
        title: "Suzume",
        description: "Uma porta misteriosa leva Suzume numa jornada espiritual pelo Japão.",
        highlight: "Fantasia animada cheia de simbolismo.",
        poster: "https://image.tmdb.org/t/p/w500/vIeu8WysZrTSFb2uhPViKjX9EcC.jpg",
      },
      divertido: {
        id: 614930,
        title: "TMNT: Mutant Mayhem",
        description: "As Tartarugas Ninjas querem ser aceites enquanto enfrentam mutantes do mal.",
        highlight: "Visual ousado e humor adolescente.",
        poster: "https://image.tmdb.org/t/p/w500/1aibqe2T09NRQ2cPn0DUFR3orYS.jpg",
      },
    },
    classico: {
      intenso: {
        id: 9806,
        title: "The Incredibles",
        description: "Família de super-heróis sai da reforma para salvar o mundo.",
        highlight: "Ação animada com drama familiar.",
        poster: "https://image.tmdb.org/t/p/w500/2LqaLgk4Z226KkgPJuiOQ58wvrm.jpg",
      },
      leve: {
        id: 12,
        title: "Finding Nemo",
        description: "Peixe-palhaço atravessa o oceano para resgatar o filho.",
        highlight: "Viagem subaquática divertida e carinhosa.",
        poster: "https://image.tmdb.org/t/p/w500/egkvwITRhb1lr5VgeZ7WaqSPA2G.jpg",
      },
      emocionante: {
        id: 354912,
        title: "Coco",
        description: "Miguel visita a Terra dos Mortos para descobrir a história da família.",
        highlight: "Celebração vibrante da cultura mexicana.",
        poster: "https://image.tmdb.org/t/p/w500/gGEsBPAijhVUFoiNpgZXqRVWJt2.jpg",
      },
      misterioso: {
        id: 14836,
        title: "Coraline",
        description: "Menina descobre porta para uma versão assustadora da própria casa.",
        highlight: "Stop motion cativante e sombrio.",
        poster: "https://image.tmdb.org/t/p/w500/4SXR1YYq560Zb4McEu3G3wrGzKv.jpg",
      },
      divertido: {
        id: 20352,
        title: "Despicable Me",
        description: "Vilão Gru adota três meninas e reconsidera a vida criminosa.",
        highlight: "Minions e gargalhadas para todas as idades.",
        poster: "https://image.tmdb.org/t/p/w500/5m0F1wl3pIa0W9NwZ1j5JWxQPens.jpg",
      },
    },
    retro: {
      intenso: {
        id: 149,
        title: "Akira",
        description: "Tóquio pós-apocalíptica enfrenta o despertar de poderes psíquicos devastadores.",
        highlight: "Anime cyberpunk influente e explosivo.",
        poster: "https://image.tmdb.org/t/p/w500/5KlRFoX0KvkFJ7fa3wA7Q8n4b3f.jpg",
      },
      leve: {
        id: 8392,
        title: "My Neighbor Totoro",
        description: "Irmãs conhecem criaturas mágicas no interior do Japão.",
        highlight: "Calma e imaginação em formato de conto de fadas.",
        poster: "https://image.tmdb.org/t/p/w500/rtGDOeG9LzoerkDGZF9dnVeLppL.jpg",
      },
      emocionante: {
        id: 8587,
        title: "The Lion King",
        description: "Simba precisa ocupar o lugar de rei após tragédia familiar.",
        highlight: "Clássico Disney cheio de músicas icónicas.",
        poster: "https://image.tmdb.org/t/p/w500/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg",
      },
      misterioso: {
        id: 10494,
        title: "Perfect Blue",
        description: "Ex-idol japonesa é perseguida enquanto perde a noção da realidade.",
        highlight: "Thriller psicológico intenso do anime dos 90.",
        poster: "https://image.tmdb.org/t/p/w500/hvSv8M6kclLLR5sXUralTfbFl1V.jpg",
      },
      divertido: {
        id: 862,
        title: "Toy Story",
        description: "Brinquedos ganham vida e encaram ciúmes, amizade e aventuras.",
        highlight: "Humor e emoção no primeiro longa em CGI.",
        poster: "https://image.tmdb.org/t/p/w500/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg",
      },
    },
  },
};

const MOVIE_BANK: MovieSuggestion[] = Object.entries(FALLBACK_LIBRARY).flatMap(([genreKey, periodMap]) =>
  Object.entries(periodMap).flatMap(([periodKey, vibeMap]) =>
    Object.entries(vibeMap).map(([vibeKey, movie]) => ({
      ...movie,
      genre: genreKey as GenreOption,
      period: periodKey as PeriodOption,
      vibe: vibeKey as VibeOption,
    }))
  )
);

const GENRE_MAP: Record<string, number> = {
  acao: 28,
  comedia: 35,
  drama: 18,
  ficcao: 878,
  terror: 27,
  animacao: 16,
};

const PERIOD_RULES: Record<string, { from?: number; to?: number }> = {
  novo: { from: new Date().getFullYear() - 5 },
  classico: { from: 2000, to: new Date().getFullYear() - 6 },
  retro: { to: 1999 },
};

type VibeRule = {
  genres?: number[];
  minRating?: number;
  maxRating?: number;
  avoidGenres?: number[];
};

const VIBE_RULES: Record<string, VibeRule> = {
  intenso: { genres: [28, 53, 878, 27], minRating: 7 },
  leve: { genres: [35, 10751, 10402], maxRating: 7.6, avoidGenres: [27] },
  emocionante: { genres: [18, 10749], minRating: 7.2 },
  misterioso: { genres: [9648, 53, 27] },
  divertido: { genres: [35, 16, 12], maxRating: 8 },
};

const parseYear = (value?: string | null): number | null => {
  if (!value) return null;
  const year = Number.parseInt(value.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
};

const matchesPeriod = (movie: ApiMovie, period: string) => {
  const year = parseYear(movie.data_lancamento);
  if (!year) return true;
  const rule = PERIOD_RULES[period];
  if (!rule) return true;
  if (rule.from && year < rule.from) return false;
  if (rule.to && year > rule.to) return false;
  return true;
};

const matchesVibe = (movie: ApiMovie, vibe: string) => {
  const rule = VIBE_RULES[vibe];
  if (!rule) return true;
  const movieGenres = movie.generos_ids ?? [];
  if (rule.avoidGenres && movieGenres.some((id) => rule.avoidGenres?.includes(id))) {
    return false;
  }
  if (rule.genres && rule.genres.some((id) => movieGenres.includes(id))) {
    return true;
  }
  if (rule.minRating && (movie.nota ?? 0) < rule.minRating) {
    return false;
  }
  if (rule.maxRating && (movie.nota ?? 0) > rule.maxRating) {
    return false;
  }
  return !rule.genres;
};

const applyAnswerFilters = (movies: ApiMovie[], answers: Record<string, string>) => {
  if (!movies.length) return [];
  const periodMatches = movies.filter((movie) => matchesPeriod(movie, answers.period));
  const vibeMatches = periodMatches.filter((movie) => matchesVibe(movie, answers.vibe));
  if (vibeMatches.length) {
    return vibeMatches;
  }
  if (periodMatches.length) {
    return periodMatches;
  }
  const vibeOnly = movies.filter((movie) => matchesVibe(movie, answers.vibe));
  if (vibeOnly.length) {
    return vibeOnly;
  }
  return movies;
};

const mapApiMovieToSuggestion = (movie: ApiMovie, answers: Record<string, string>): MovieSuggestion => {
  const year = parseYear(movie.data_lancamento);
  const highlightPieces: string[] = [];
  if (year) highlightPieces.push(`Lançado em ${year}`);
  if (typeof movie.nota === "number" && movie.nota > 0) {
    highlightPieces.push(`Classificação ${movie.nota.toFixed(1)}/10`);
  }

  return {
    id: movie.id,
    title: movie.titulo || movie.titulo_original || "Filme misterioso",
    genre: answers.genre,
    vibe: answers.vibe,
    period: answers.period,
    description: movie.sinopse?.trim() || "Sem sinopse disponível.",
    highlight: highlightPieces.length ? highlightPieces.join(" · ") : "Perfeito para o teu mood!",
    poster: movie.poster || posterPlaceholder,
  };
};

const getMatchScore = (movie: MovieSuggestion, answers: Record<string, string>) =>
  QUESTIONS.reduce((score, question) => score + (movie[question.id] === answers[question.id] ? 1 : 0), 0);

const pickSuggestionFromPool = (pool: MovieSuggestion[], lastId: number | null) => {
  if (!pool.length) return null;
  const filtered = lastId && pool.length > 1 ? pool.filter((movie) => movie.id !== lastId) : pool;
  const list = filtered.length ? filtered : pool;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
};

const buildSuggestionPool = (answers: Record<string, string>) => {
  const exactMatches = MOVIE_BANK.filter((movie) => getMatchScore(movie, answers) === QUESTIONS.length);
  if (exactMatches.length >= 2) {
    return exactMatches;
  }

  const strongMatches = MOVIE_BANK.filter((movie) => getMatchScore(movie, answers) >= QUESTIONS.length - 1);
  if (strongMatches.length >= 2) {
    return Array.from(new Map([...exactMatches, ...strongMatches].map((movie) => [movie.id, movie])).values());
  }

  const looseMatches = MOVIE_BANK.filter((movie) =>
    QUESTIONS.some((question) => movie[question.id] === answers[question.id])
  );
  if (looseMatches.length > 0) {
    return Array.from(new Map([...exactMatches, ...strongMatches, ...looseMatches].map((movie) => [movie.id, movie])).values());
  }

  return MOVIE_BANK;
};

export default function RandomMovieGame({ isOpen, onClose }: RandomMovieGameProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<MovieSuggestion | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [lastSuggestionId, setLastSuggestionId] = useState<number | null>(null);
  const navigate = useNavigate();

  const currentQuestion = QUESTIONS[step];

  useEffect(() => {
    if (!isOpen) {
      setStep(0);
      setAnswers({});
      setResult(null);
      setIsFetching(false);
      setFetchError(null);
      setIsQuizComplete(false);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  const answerSummary = useMemo(() => {
    if (!result || Object.keys(answers).length < QUESTIONS.length) {
      return null;
    }
    return QUESTIONS.map((question) => question.options.find((option) => option.value === answers[question.id])?.label)
      .filter(Boolean)
      .join(" · ");
  }, [answers, result]);

  const finalizeGame = async (finalAnswers: Record<string, string>) => {
    setIsFetching(true);
    setResult(null);
    setFetchError(null);

    try {
      const genreId = GENRE_MAP[finalAnswers.genre];
      const endpoint = genreId ? `/filmes/genero/${genreId}` : "/filmes/populares";
      const response = await fetch(buildApiUrl(endpoint));
      if (!response.ok) {
        throw new Error("Falha ao obter filmes por género");
      }
      const apiMovies = (await response.json()) as ApiMovie[];
      const filteredMovies = applyAnswerFilters(apiMovies, finalAnswers);
      const finalMovies = filteredMovies.length ? filteredMovies : apiMovies;
      let suggestionPool = finalMovies.map((movie) => mapApiMovieToSuggestion(movie, finalAnswers));

      if (!suggestionPool.length) {
        suggestionPool = buildSuggestionPool(finalAnswers);
      }

      const suggestion = pickSuggestionFromPool(suggestionPool, lastSuggestionId);
      if (!suggestion) {
        throw new Error("Sem sugestões disponíveis");
      }

      setResult(suggestion);
      setLastSuggestionId(suggestion.id);
    } catch (error) {
      console.warn("RandomMovieGame: erro ao procurar filmes", error);
      setFetchError("Não encontrámos filmes com essas preferências. Tenta novamente.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleOptionSelect = (value: string) => {
    if (isFetching) return;
    const nextAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(nextAnswers);

    if (step === QUESTIONS.length - 1) {
      setIsQuizComplete(true);
      void finalizeGame(nextAnswers);
      return;
    }

    setStep((prev) => Math.min(prev + 1, QUESTIONS.length - 1));
  };

  const handleBack = () => {
    if (step === 0) {
      onClose();
      return;
    }
    setStep((prev) => Math.max(prev - 1, 0));
    setResult(null);
    setFetchError(null);
    setIsQuizComplete(false);
    setIsFetching(false);
  };

  const handleRestart = () => {
    setStep(0);
    setAnswers({});
    setResult(null);
    setFetchError(null);
    setIsFetching(false);
    setIsQuizComplete(false);
  };

  const handleViewDetails = () => {
    if (!result) return;
    onClose();
    navigate(`/filme/${result.id}`);
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleViewDetails();
    }
  };

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={`movie-game-overlay ${isOpen ? "open" : ""}`} onClick={handleOverlayClick}>
      <div className="movie-game-panel" role="dialog" aria-modal="true" aria-label="Random Movie Game">
        <button type="button" className="movie-game-close" onClick={onClose} aria-label="Fechar jogo">
          ×
        </button>

        <div className="movie-game-header">
          <h2>Random Movie Game</h2>
          <p>Responde a 3 perguntas rápidas e descobre um filme à tua medida.</p>
        </div>

        {!isQuizComplete && (
          <div className="movie-game-question">
            <span className="movie-game-step">Pergunta {step + 1} / {QUESTIONS.length}</span>
            <h3>{currentQuestion.title}</h3>
            <p>{currentQuestion.helper}</p>
            <div className="movie-game-options">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="movie-game-option"
                  onClick={() => handleOptionSelect(option.value)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.helper}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isFetching && (
          <div className="movie-game-loading" role="status" aria-live="polite">
            <div className="movie-game-spinner" />
            <p>Estamos a procurar o filme perfeito para ti...</p>
          </div>
        )}

        {fetchError && !result && !isFetching && (
          <p className="movie-game-error" role="alert">{fetchError}</p>
        )}

        {result && (
          <div className="movie-game-result">
            <p className="movie-game-summary">Combinação escolhida: {answerSummary}</p>
            <div
              className="movie-card"
              role="button"
              tabIndex={0}
              onClick={handleViewDetails}
              onKeyDown={handleCardKeyDown}
            >
              <div className="movie-card-media">
                <img src={result.poster || posterPlaceholder} alt={`Poster de ${result.title}`} />
              </div>
              <div className="movie-card-body">
                <p className="movie-card-chip">Filme sugerido</p>
                <h3>{result.title}</h3>
                <p>{result.description}</p>
                <p className="movie-card-highlight">{result.highlight}</p>
                <p className="movie-card-cta">Clica para abrir os detalhes.</p>
              </div>
            </div>
          </div>
        )}

        <div className="movie-game-actions">
          {!isQuizComplete && (
            <button type="button" className="movie-game-secondary" onClick={handleBack}>
              {step === 0 ? "Sair" : "Voltar"}
            </button>
          )}
          {isQuizComplete && !result && !isFetching && (
            <button type="button" className="movie-game-secondary" onClick={handleRestart}>
              Tentar novamente
            </button>
          )}
          {result && (
            <>
              <button type="button" className="movie-game-secondary" onClick={onClose}>
                Fechar
              </button>
              <button type="button" className="movie-game-secondary" onClick={handleViewDetails}>
                Ir para detalhes
              </button>
              <button type="button" className="movie-game-primary" onClick={handleRestart}>
                Jogar outra vez
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
