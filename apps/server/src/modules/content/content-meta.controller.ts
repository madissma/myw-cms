import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { resourceSchemas } from './content.registry';

/**
 * 内容资源的表单描述。后台六类内容共用一套列表 + 编辑抽屉，
 * 字段名、标题、控件类型全部由 content.registry 单点决定，前端不写死。
 * 只读元数据、不含业务内容，因此不挂 @Perm（登录即可），具体数据接口仍逐个鉴权。
 */
@ApiTags('后台-内容模型')
@Controller('admin/content')
export class AdminContentMetaController {
  @Get('resources')
  @ApiOperation({ summary: '六类内容的字段与列表列描述' })
  resources() {
    return resourceSchemas();
  }
}
