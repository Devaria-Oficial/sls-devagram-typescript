import { validateEnvs } from './../utils/environmentsUtils';
import { imageExtensionsAllowed } from './../constants/Regexes';
import { S3Service } from './../services/S3Services';
import { UserModel } from './../models/UserModel';
import { getUserIdFromEvent } from './../utils/authenticationHandlerUtils';
import { APIGatewayEvent, Handler } from "aws-lambda";
import { DefaultJsonResponse, formatDefaultResponse } from "../utils/formatResponsUtil";
import { parse } from 'aws-multipart-parser';
import { FileData } from 'aws-multipart-parser/dist/models';

export const me: Handler = async (event: APIGatewayEvent):
    Promise<DefaultJsonResponse> => {
    try {
        const { AVATAR_BUCKET, error } = validateEnvs(['AVATAR_BUCKET',
            'USER_TABLE']);
        if (error) {
            return formatDefaultResponse(500, error);
        }

        const userId = getUserIdFromEvent(event);
        if(!userId){
            return formatDefaultResponse(400, 'Usuário não encontrado.');
        }

        const user = await UserModel.get({'cognitoId' : userId});
        if(user && user.avatar){
            const url = await new S3Service().getImageURL(AVATAR_BUCKET, user.avatar);
            user.avatar = url;
        }

        return formatDefaultResponse(200, undefined, user);
    } catch (error) {
        console.log('Error on login user:', error);
        return formatDefaultResponse(500, 'Erro ao autenticar usuario! Tente novamente ou contacte o administrador do sistema.');
    }
}

export const update : Handler = async(event : APIGatewayEvent) :
    Promise<DefaultJsonResponse> =>{
    try{
        const { AVATAR_BUCKET, error } = validateEnvs(['AVATAR_BUCKET',
            'USER_TABLE']);
        if (error) {
            return formatDefaultResponse(500, error);
        }

        const userId = getUserIdFromEvent(event);
        if(!userId){
            return formatDefaultResponse(400, 'Usuário não encontrado.');
        }

        const user = await UserModel.get({'cognitoId' : userId});

        const formData = parse(event, true);
        const file = formData.file as FileData;
        const name = formData.name as string;

        if(name && name.trim().length < 2){
            return formatDefaultResponse(400, 'Nome inválido');
        }else if(name){
            user.name = name;
        }

        if(file && !imageExtensionsAllowed.exec(file.filename)){
            return formatDefaultResponse(400, 'Extensão informada do arquivo não é válida');
        }else if(file){
            const newKey = await new S3Service().saveImage(AVATAR_BUCKET, 'avatar', file);
            user.avatar = newKey;
        }

        await UserModel.update(user);
        return formatDefaultResponse(200, 'Usuário alterado com sucesso!');
    }catch(error){
        console.log('Error on update user data:', error);
        return formatDefaultResponse(500, 'Erro ao atualizar dados do usuario! Tente novamente ou contacte o administrador do sistema.');
    }
}