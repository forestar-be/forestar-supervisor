'use client';

import { addRobotType, deleteRobotType, fetchRobotTypes } from '@/lib/api';
import EditEntity from './edit-entity';

/** Types de robot : mêmes règles qu'`EditEntity`, avec les endpoints dédiés. */
export default function EditRobotType() {
  return (
    <EditEntity
      entityName="Type de robot"
      fetchEntities={fetchRobotTypes}
      addEntity={addRobotType}
      deleteEntity={deleteRobotType}
    />
  );
}
