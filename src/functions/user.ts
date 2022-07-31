import { S3Service } from './../services/S3Services';
import { UserModel } from './../models/UserModel';
import { getUserIdFromEvent } from './../utils/authenticationHandlerUtils';
import { APIGatewayEvent, Handler } from "aws-lambda";
import { DefaultJsonResponse, formatDefaultResponse } from "../utils/formatResponsUtil";

export const me: Handler = async (event: APIGatewayEvent):
    Promise<DefaultJsonResponse> => {
    try {
        const {USER_TABLE,AVATAR_BUCKET} = process.env;
        if (!USER_TABLE || !AVATAR_BUCKET) {
            return formatDefaultResponse(500, 'ENVs para servico não encontradas.');
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