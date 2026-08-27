export interface Canton {
  code: string;
  name: string;
}

export interface Provincia {
  code: string;
  name: string;
  cantones: Canton[];
}

export const ECUADOR_GEO: Provincia[] = [
  {
    code: 'AZ', name: 'Azuay',
    cantones: [
      { code: 'AZ01', name: 'Cuenca' }, { code: 'AZ02', name: 'Girón' },
      { code: 'AZ03', name: 'Gualaceo' }, { code: 'AZ04', name: 'Nabón' },
      { code: 'AZ05', name: 'Paute' }, { code: 'AZ06', name: 'Pucará' },
      { code: 'AZ07', name: 'San Fernando' }, { code: 'AZ08', name: 'Santa Isabel' },
      { code: 'AZ09', name: 'Sigsig' }, { code: 'AZ10', name: 'Oña' },
      { code: 'AZ11', name: 'Chordeleg' }, { code: 'AZ12', name: 'El Pan' },
      { code: 'AZ13', name: 'Sevilla de Oro' }, { code: 'AZ14', name: 'Guachapala' },
      { code: 'AZ15', name: 'Camilo Ponce Enríquez' },
    ],
  },
  {
    code: 'BO', name: 'Bolívar',
    cantones: [
      { code: 'BO01', name: 'Guaranda' }, { code: 'BO02', name: 'Chillanes' },
      { code: 'BO03', name: 'Chimbo' }, { code: 'BO04', name: 'Echeandía' },
      { code: 'BO05', name: 'San Miguel' }, { code: 'BO06', name: 'Caluma' },
      { code: 'BO07', name: 'Las Naves' },
    ],
  },
  {
    code: 'CA', name: 'Cañar',
    cantones: [
      { code: 'CA01', name: 'Azogues' }, { code: 'CA02', name: 'Biblián' },
      { code: 'CA03', name: 'Cañar' }, { code: 'CA04', name: 'La Troncal' },
      { code: 'CA05', name: 'El Tambo' }, { code: 'CA06', name: 'Déleg' },
      { code: 'CA07', name: 'Suscal' },
    ],
  },
  {
    code: 'CR', name: 'Carchi',
    cantones: [
      { code: 'CR01', name: 'Tulcán' }, { code: 'CR02', name: 'Bolívar' },
      { code: 'CR03', name: 'Espejo' }, { code: 'CR04', name: 'Mira' },
      { code: 'CR05', name: 'Montúfar' }, { code: 'CR06', name: 'San Pedro de Huaca' },
    ],
  },
  {
    code: 'CH', name: 'Chimborazo',
    cantones: [
      { code: 'CH01', name: 'Riobamba' }, { code: 'CH02', name: 'Alausí' },
      { code: 'CH03', name: 'Colta' }, { code: 'CH04', name: 'Chambo' },
      { code: 'CH05', name: 'Chunchi' }, { code: 'CH06', name: 'Guamote' },
      { code: 'CH07', name: 'Guano' }, { code: 'CH08', name: 'Pallatanga' },
      { code: 'CH09', name: 'Penipe' }, { code: 'CH10', name: 'Cumandá' },
    ],
  },
  {
    code: 'CO', name: 'Cotopaxi',
    cantones: [
      { code: 'CO01', name: 'Latacunga' }, { code: 'CO02', name: 'La Maná' },
      { code: 'CO03', name: 'Pangua' }, { code: 'CO04', name: 'Pujilí' },
      { code: 'CO05', name: 'Salcedo' }, { code: 'CO06', name: 'Saquisilí' },
      { code: 'CO07', name: 'Sigchos' },
    ],
  },
  {
    code: 'ES', name: 'Esmeraldas',
    cantones: [
      { code: 'ES01', name: 'Esmeraldas' }, { code: 'ES02', name: 'Atacames' },
      { code: 'ES03', name: 'Eloy Alfaro' }, { code: 'ES04', name: 'Muisne' },
      { code: 'ES05', name: 'Quinindé' }, { code: 'ES06', name: 'Rioverde' },
      { code: 'ES07', name: 'San Lorenzo' }, { code: 'ES08', name: 'La Concordia' },
    ],
  },
  {
    code: 'GA', name: 'Galápagos',
    cantones: [
      { code: 'GA01', name: 'San Cristóbal' }, { code: 'GA02', name: 'Santa Cruz' },
      { code: 'GA03', name: 'Isabela' },
    ],
  },
  {
    code: 'GU', name: 'Guayas',
    cantones: [
      { code: 'GU01', name: 'Guayaquil' }, { code: 'GU02', name: 'Alfredo Baquerizo Moreno' },
      { code: 'GU03', name: 'Balao' }, { code: 'GU04', name: 'Balzar' },
      { code: 'GU05', name: 'Colimes' }, { code: 'GU06', name: 'Daule' },
      { code: 'GU07', name: 'Durán' }, { code: 'GU08', name: 'El Empalme' },
      { code: 'GU09', name: 'El Triunfo' }, { code: 'GU10', name: 'Milagro' },
      { code: 'GU11', name: 'Naranjal' }, { code: 'GU12', name: 'Naranjito' },
      { code: 'GU13', name: 'Palestina' }, { code: 'GU14', name: 'Pedro Carbo' },
      { code: 'GU15', name: 'Playas' }, { code: 'GU16', name: 'Samborondón' },
      { code: 'GU17', name: 'Santa Lucía' }, { code: 'GU18', name: 'Salitre' },
      { code: 'GU19', name: 'Simón Bolívar' }, { code: 'GU20', name: 'Yaguachi' },
      { code: 'GU21', name: 'Lomas de Sargentillo' }, { code: 'GU22', name: 'Nobol' },
      { code: 'GU23', name: 'General Antonio Elizalde' }, { code: 'GU24', name: 'Isidro Ayora' },
    ],
  },
  {
    code: 'IM', name: 'Imbabura',
    cantones: [
      { code: 'IM01', name: 'Ibarra' }, { code: 'IM02', name: 'Antonio Ante' },
      { code: 'IM03', name: 'Cotacachi' }, { code: 'IM04', name: 'Otavalo' },
      { code: 'IM05', name: 'Pimampiro' }, { code: 'IM06', name: 'San Miguel de Urcuquí' },
    ],
  },
  {
    code: 'LO', name: 'Loja',
    cantones: [
      { code: 'LO01', name: 'Loja' }, { code: 'LO02', name: 'Calvas' },
      { code: 'LO03', name: 'Catamayo' }, { code: 'LO04', name: 'Celica' },
      { code: 'LO05', name: 'Chaguarpamba' }, { code: 'LO06', name: 'Espíndola' },
      { code: 'LO07', name: 'Gonzanamá' }, { code: 'LO08', name: 'Macará' },
      { code: 'LO09', name: 'Paltas' }, { code: 'LO10', name: 'Pindal' },
      { code: 'LO11', name: 'Quilanga' }, { code: 'LO12', name: 'Saraguro' },
      { code: 'LO13', name: 'Sozoranga' }, { code: 'LO14', name: 'Zapotillo' },
      { code: 'LO15', name: 'Puyango' }, { code: 'LO16', name: 'Olmedo' },
    ],
  },
  {
    code: 'LR', name: 'Los Ríos',
    cantones: [
      { code: 'LR01', name: 'Babahoyo' }, { code: 'LR02', name: 'Baba' },
      { code: 'LR03', name: 'Montalvo' }, { code: 'LR04', name: 'Puebloviejo' },
      { code: 'LR05', name: 'Quevedo' }, { code: 'LR06', name: 'Urdaneta' },
      { code: 'LR07', name: 'Ventanas' }, { code: 'LR08', name: 'Vinces' },
      { code: 'LR09', name: 'Palenque' }, { code: 'LR10', name: 'Buena Fé' },
      { code: 'LR11', name: 'Valencia' }, { code: 'LR12', name: 'Mocache' },
      { code: 'LR13', name: 'Quinsaloma' },
    ],
  },
  {
    code: 'MA', name: 'Manabí',
    cantones: [
      { code: 'MA01', name: 'Portoviejo' }, { code: 'MA02', name: 'Bolívar' },
      { code: 'MA03', name: 'Chone' }, { code: 'MA04', name: 'El Carmen' },
      { code: 'MA05', name: 'Flavio Alfaro' }, { code: 'MA06', name: 'Jipijapa' },
      { code: 'MA07', name: 'Junín' }, { code: 'MA08', name: 'Manta' },
      { code: 'MA09', name: 'Montecristi' }, { code: 'MA10', name: 'Paján' },
      { code: 'MA11', name: 'Pedernales' }, { code: 'MA12', name: 'Pichincha' },
      { code: 'MA13', name: 'Rocafuerte' }, { code: 'MA14', name: 'Santa Ana' },
      { code: 'MA15', name: 'Sucre' }, { code: 'MA16', name: 'Tosagua' },
      { code: 'MA17', name: '24 de Mayo' }, { code: 'MA18', name: 'Olmedo' },
      { code: 'MA19', name: 'Puerto López' }, { code: 'MA20', name: 'Jama' },
      { code: 'MA21', name: 'Jaramijó' }, { code: 'MA22', name: 'San Vicente' },
    ],
  },
  {
    code: 'MO', name: 'Morona Santiago',
    cantones: [
      { code: 'MO01', name: 'Macas' }, { code: 'MO02', name: 'Gualaquiza' },
      { code: 'MO03', name: 'Huamboya' }, { code: 'MO04', name: 'Limón Indanza' },
      { code: 'MO05', name: 'Logroño' }, { code: 'MO06', name: 'Morona' },
      { code: 'MO07', name: 'Pablo Sexto' }, { code: 'MO08', name: 'Palora' },
      { code: 'MO09', name: 'San Juan Bosco' }, { code: 'MO10', name: 'Santiago' },
      { code: 'MO11', name: 'Sucúa' }, { code: 'MO12', name: 'Taisha' },
      { code: 'MO13', name: 'Tiwintza' },
    ],
  },
  {
    code: 'NA', name: 'Napo',
    cantones: [
      { code: 'NA01', name: 'Tena' }, { code: 'NA02', name: 'Archidona' },
      { code: 'NA03', name: 'El Chaco' }, { code: 'NA04', name: 'Quijos' },
      { code: 'NA05', name: 'Carlos Julio Arosemena Tola' },
    ],
  },
  {
    code: 'OR', name: 'Orellana',
    cantones: [
      { code: 'OR01', name: 'Puerto Francisco de Orellana (Coca)' },
      { code: 'OR02', name: 'Aguarico' }, { code: 'OR03', name: 'La Joya de los Sachas' },
      { code: 'OR04', name: 'Loreto' },
    ],
  },
  {
    code: 'PA', name: 'Pastaza',
    cantones: [
      { code: 'PA01', name: 'Puyo' }, { code: 'PA02', name: 'Arajuno' },
      { code: 'PA03', name: 'Mera' }, { code: 'PA04', name: 'Santa Clara' },
    ],
  },
  {
    code: 'PI', name: 'Pichincha',
    cantones: [
      { code: 'PI01', name: 'Quito' }, { code: 'PI02', name: 'Cayambe' },
      { code: 'PI03', name: 'Mejía' }, { code: 'PI04', name: 'Pedro Moncayo' },
      { code: 'PI05', name: 'Rumiñahui' }, { code: 'PI06', name: 'San Miguel de los Bancos' },
      { code: 'PI07', name: 'Pedro Vicente Maldonado' }, { code: 'PI08', name: 'Puerto Quito' },
    ],
  },
  {
    code: 'SD', name: 'Santo Domingo de los Tsáchilas',
    cantones: [
      { code: 'SD01', name: 'Santo Domingo' }, { code: 'SD02', name: 'La Concordia' },
    ],
  },
  {
    code: 'SE', name: 'Santa Elena',
    cantones: [
      { code: 'SE01', name: 'Santa Elena' }, { code: 'SE02', name: 'La Libertad' },
      { code: 'SE03', name: 'Salinas' },
    ],
  },
  {
    code: 'SU', name: 'Sucumbíos',
    cantones: [
      { code: 'SU01', name: 'Nueva Loja (Lago Agrio)' }, { code: 'SU02', name: 'Cascales' },
      { code: 'SU03', name: 'Cuyabeno' }, { code: 'SU04', name: 'Gonzalo Pizarro' },
      { code: 'SU05', name: 'Putumayo' }, { code: 'SU06', name: 'Shushufindi' },
      { code: 'SU07', name: 'Sucumbíos' },
    ],
  },
  {
    code: 'TU', name: 'Tungurahua',
    cantones: [
      { code: 'TU01', name: 'Ambato' }, { code: 'TU02', name: 'Baños de Agua Santa' },
      { code: 'TU03', name: 'Cevallos' }, { code: 'TU04', name: 'Mocha' },
      { code: 'TU05', name: 'Patate' }, { code: 'TU06', name: 'Quero' },
      { code: 'TU07', name: 'San Pedro de Pelileo' }, { code: 'TU08', name: 'Santiago de Píllaro' },
      { code: 'TU09', name: 'Tisaleo' },
    ],
  },
  {
    code: 'ZC', name: 'Zamora Chinchipe',
    cantones: [
      { code: 'ZC01', name: 'Zamora' }, { code: 'ZC02', name: 'Chinchipe' },
      { code: 'ZC03', name: 'El Pangui' }, { code: 'ZC04', name: 'Nangaritza' },
      { code: 'ZC05', name: 'Palanda' }, { code: 'ZC06', name: 'Paquisha' },
      { code: 'ZC07', name: 'Yacuambi' }, { code: 'ZC08', name: 'Yanzatza' },
      { code: 'ZC09', name: 'Centinela del Cóndor' },
    ],
  },
  {
    code: 'EO', name: 'El Oro',
    cantones: [
      { code: 'EO01', name: 'Machala' }, { code: 'EO02', name: 'Arenillas' },
      { code: 'EO03', name: 'Atahualpa' }, { code: 'EO04', name: 'Balsas' },
      { code: 'EO05', name: 'Chilla' }, { code: 'EO06', name: 'El Guabo' },
      { code: 'EO07', name: 'Huaquillas' }, { code: 'EO08', name: 'Marcabelí' },
      { code: 'EO09', name: 'Pasaje' }, { code: 'EO10', name: 'Piñas' },
      { code: 'EO11', name: 'Portovelo' }, { code: 'EO12', name: 'Santa Rosa' },
      { code: 'EO13', name: 'Zaruma' }, { code: 'EO14', name: 'Las Lajas' },
    ],
  },
];
