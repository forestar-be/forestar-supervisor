import React from 'react';
import EditEntity from './EditEntity';
import { fetchRobotTypes, addRobotType, deleteRobotType } from '../../utils/api';

const EditRobotType: React.FC = () => {
  return (
    <EditEntity
      entityName="Type de robot"
      fetchEntities={fetchRobotTypes}
      addEntity={addRobotType}
      deleteEntity={deleteRobotType}
    />
  );
};

export default EditRobotType;