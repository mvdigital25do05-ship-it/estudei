import type { Discipline, ExamPriority } from './types';
import { normalizeOutlineName } from './outlineImport';

export interface PriorityEvidenceRow {
  row: number;
  discipline: string;
  topic: string;
  priority: ExamPriority;
  legalScope: string;
  evidence: string;
}

export interface PriorityEvidenceImport {
  source: string;
  rows: PriorityEvidenceRow[];
}

export interface PriorityAssignment {
  row: number;
  disciplineId: string;
  topicId: string;
}

export interface PriorityImportPreview {
  disciplines: Discipline[];
  applied: number;
  overwritten: number;
  unchanged: number;
}

const ALIASES: Record<string,string> = {
  'processo penal': 'direito processual penal',
  'processo civil': 'direito processual civil',
  'constitucional': 'direito constitucional',
  'administrativo': 'direito administrativo',
  'portugues': 'lingua portuguesa',
  'atualidades/lbi': 'atualidades e inclusao',
  'atualidades lbi': 'atualidades e inclusao',
};

export function resolveEvidenceDiscipline(name: string): string {
  const key=normalizeOutlineName(name);
  return ALIASES[key] || key;
}

/** Parse pasted Excel TSV or exported CSV with quotes, escaped quotes and CRLF. */
function parseTable(text: string, delimiter: ','|'\t'): string[][] {
  const rows: string[][]=[];
  let cells:string[]=[];
  let cell='';
  let quoted=false;
  for(let i=0;i<text.length;i++) {
    const char=text[i];
    if(char==='"'){
      if(quoted && text[i+1]==='"'){cell+='"';i++;}
      else quoted=!quoted;
    }else if(char===delimiter&&!quoted){cells.push(cell.trim());cell='';}
    else if((char==='\n'||char==='\r')&&!quoted){
      if(char==='\r'&&text[i+1]==='\n')i++;
      cells.push(cell.trim());cell='';
      if(cells.some(v=>v))rows.push(cells);
      cells=[];
    }else cell+=char;
  }
  if(quoted)throw new Error('Tabela possui aspas não fechadas.');
  cells.push(cell.trim());
  if(cells.some(v=>v))rows.push(cells);
  return rows;
}

export function parsePriorityEvidence(text: string, source: string): PriorityEvidenceImport {
  const cleanSource=source.trim();
  if(!cleanSource || cleanSource.length>180)throw new Error('Informe a fonte da classificação (até 180 caracteres).');
  if(!text.trim() || text.length>400_000)throw new Error('Cole até 400 KB da tabela ABC.');
  const rows=parseTable(text.replace(/^\uFEFF/,''),text.includes('\t')?'\t':',');
  if(rows.length<2 || rows.length>501)throw new Error('Informe cabeçalho e até 500 assuntos.');

  const headers=rows[0].map(normalizeOutlineName);
  const indexOf=(...names:string[])=>headers.findIndex(item=>names.includes(item));
  const disc=indexOf('disciplina','materia');
  const priority=indexOf('abc','prioridade');
  const topic=indexOf('assunto','topico');
  const scope=indexOf('recorte','artigos');
  const evidence=indexOf('fundamento','fonte','evidencia');
  if(disc<0||priority<0||topic<0) {
    throw new Error('A tabela deve ter colunas Disciplina, ABC e Assunto.');
  }

  const parsed:PriorityEvidenceRow[]=[];
  for(const [i,cells] of rows.slice(1).entries()) {
    const discipline=(cells[disc]||'').trim();
    const topicName=(cells[topic]||'').trim();
    const grade=(cells[priority]||'').trim().toUpperCase();
    if(!discipline || !topicName || !['A','B','C'].includes(grade) ||
      discipline.length>160 || topicName.length>240) {
      throw new Error(`Linha ${i+2}: disciplina, assunto ou A/B/C inválido.`);
    }
    parsed.push({
      row:i,
      discipline,
      topic:topicName,
      priority:grade as ExamPriority,
      legalScope:(scope>=0?cells[scope]||'':'').slice(0,500),
      evidence:(evidence>=0?cells[evidence]||'':'').slice(0,500),
    });
  }
  return {source:cleanSource,rows:parsed};
}

export function matchEvidenceExact(
  disciplines:Discipline[],
  evidence:PriorityEvidenceImport
):PriorityAssignment[] {
  const result:PriorityAssignment[]=[];
  for(const row of evidence.rows){
    const d=disciplines.filter(item=>
      normalizeOutlineName(item.name)===resolveEvidenceDiscipline(row.discipline));
    if(d.length!==1)continue;
    const topics=d[0].topics.filter(item=>
      normalizeOutlineName(item.name)===normalizeOutlineName(row.topic));
    if(topics.length!==1)continue;
    result.push({row:row.row,disciplineId:d[0].id,topicId:topics[0].id});
  }
  return result;
}

/** Applies ONLY explicit selected mappings, preserving progress and log IDs. */
export function previewPriorityAssignments(
  disciplines:Discipline[],
  evidence:PriorityEvidenceImport,
  assignments:PriorityAssignment[]
):PriorityImportPreview {
  const byRow=new Map(evidence.rows.map(row=>[row.row,row]));
  const chosen=new Map<string,PriorityEvidenceRow>();
  for(const item of assignments) {
    const row=byRow.get(item.row);
    if(!row)throw new Error('Assunto escolhido não existe no arquivo.');
    const d=disciplines.find(x=>x.id===item.disciplineId);
    if(!d || normalizeOutlineName(d.name)!==resolveEvidenceDiscipline(row.discipline)) {
      throw new Error('A matéria de destino não corresponde à matéria da planilha.');
    }
    if(!d.topics.some(t=>t.id===item.topicId)){
      throw new Error('O tópico escolhido não existe na matéria de destino.');
    }
    const key=`${item.disciplineId}::${item.topicId}`;
    const previous=chosen.get(key);
    if(previous && previous.priority!==row.priority){
      throw new Error(`Classificações conflitantes no tópico "${row.topic}". Escolha apenas uma.`);
    }
    chosen.set(key,row);
  }
  let applied=0,overwritten=0,unchanged=0;
  const next=disciplines.map(d=>({
    ...d,
    topics:d.topics.map(topic=>{
      const row=chosen.get(`${d.id}::${topic.id}`);
      if(!row)return topic;
      if(topic.examPriority===row.priority && topic.examPrioritySource===evidence.source){
        unchanged++; return topic;
      }
      if(topic.examPriority && topic.examPriority!==row.priority)overwritten++;
      applied++;
      return {
        ...topic,examPriority:row.priority,
        examPrioritySource:evidence.source,
      };
    })
  }));
  return {disciplines:next,applied,overwritten,unchanged};
}
