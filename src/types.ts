export interface LineMeta {
  id: string
  name: string
  color: string
  order: number
}

export interface LineProps {
  lineId: string
  color: string
}

export interface StationProps {
  name: string
  lineIds: string[]
}
