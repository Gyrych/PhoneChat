#include <stdio.h>
#include <math.h>
#include <stdlib.h>

#define UOF(x)	(sizeof(x)/sizeof(float))

//-----------------------------------------------------------------------

#define TOTAL_INPUT_LAYER_UNIT		2	//输入层单元数
#define TOTAL_OUTPUT_LAYER_UNIT		1	//输出层单元数
#define TOTAL_HIDDEN_LAYER			1	//隐含层数
int TOTAL_HIDDEN_LAYER_UNIT[TOTAL_HIDDEN_LAYER] = {2};		//各隐含层单元数
#define ALL_LAYER_UNIT_MAX			2	//所有层中最多单元数
float THETA[TOTAL_HIDDEN_LAYER + 1][ALL_LAYER_UNIT_MAX];	//所有隐含层和输出层单元的阀值
float W[TOTAL_HIDDEN_LAYER + 1][ALL_LAYER_UNIT_MAX * ALL_LAYER_UNIT_MAX];	//各层间权重
float INPUT[TOTAL_INPUT_LAYER_UNIT];	//输入矩阵
float OUTPUT[TOTAL_OUTPUT_LAYER_UNIT];	//输出矩阵

#define SAMPLE_SIZE 4					//样本数
float SAMPLE_INPUT[SAMPLE_SIZE][TOTAL_INPUT_LAYER_UNIT];	//输入样本集
float SAMPLE_OUTPUT[SAMPLE_SIZE][TOTAL_OUTPUT_LAYER_UNIT];	//输出样本集

//-----------------------------------------------------------------------

//S函数
float sigmoid(float x);

//初始化ann，权重矩阵，权重总数，隐含层总数，各隐含层单元数，输入单元数，输出单元数
void init_ann(float* w, float* theta, int nh, int* nhu, int ni, int no);

//计算ann，输入矩阵，输入单元数，输出矩阵，输出单元数，权重矩阵，阀值矩阵，隐含层总数，各隐含层单元数
void ann(float* input, int ni, float* output, int no, float* w, float* theta, int nh, int* nhu);

//训练ann，样本输入矩阵，输入单元数，样本输出矩阵，输出单元数，权重矩阵，阀值矩阵，隐含层总数，各隐含层单元数,样本集总数，学习速度
int training_ann(float* sample_input, int ni, float* sample_output, int no, float* w, float* theta, int nh, int* nhu, int sn, float alfa);

//-----------------------------------------------------------------------

int main(void)
{
	float alfa;
	int i;

	init_ann(&W, &THETA, TOTAL_HIDDEN_LAYER, TOTAL_HIDDEN_LAYER_UNIT, TOTAL_INPUT_LAYER_UNIT, TOTAL_OUTPUT_LAYER_UNIT);	//初始化参数表

	printf("\n输入alfa：");
	scanf("%f", &alfa);
	if(!((alfa > 0) && (alfa < 1)))
		alfa = 0.5;

	if(training_ann(&SAMPLE_INPUT, UOF(INPUT), &SAMPLE_OUTPUT, UOF(OUTPUT), &W, &THETA, TOTAL_HIDDEN_LAYER, TOTAL_HIDDEN_LAYER_UNIT, SAMPLE_SIZE, alfa))	//训练ANN
	{
		return 0;
	}

	while(1)
	{
		for(i = 0; i < TOTAL_INPUT_LAYER_UNIT; i++)
		{
			printf("\nann输入 in%d of total %d： ", i+1, TOTAL_INPUT_LAYER_UNIT);
			scanf("%f", &(INPUT[i]));
		}
		ann(&INPUT, UOF(INPUT), &OUTPUT, UOF(OUTPUT), &W, &THETA, TOTAL_HIDDEN_LAYER, TOTAL_HIDDEN_LAYER_UNIT);

		for(i = 0; i < TOTAL_OUTPUT_LAYER_UNIT; i++)
		{
			printf("\nann输出 out%d： %g\n", i+1, OUTPUT[i]);
		}
	}

	return 0;
}

//-----------------------------------------------------------------------

//初始化ann，权重矩阵，阀值矩阵，隐含层总数，各隐含层单元数，输入单元数，输出单元数
void init_ann(float* w, float* theta, int nh, int* nhu, int ni, int no)
{
	int i, j, k;

	srand((int)time(NULL));

	for(k = 0; k < (nh + 1); k++)
	{
		if(k < nh)
		{
			for(j = 0; j < nhu[k]; j++)
			{
				if(k==0)
				{
					theta[k][j] = ((rand() % 2) ? 1 : -1) * (2.4 / ni) / (rand() % 10 + 1);
					for(i = 0; i < ni; i++)
					{
						w[k][j*ni+i] = ((rand() % 2) ? 1 : -1) * (2.4 / ni) / (rand() % 10 + 1);
					}
				}
				else
				{
					theta[k][j] = ((rand() % 2) ? 1 : -1) * (2.4 / ni) / (rand() % 10 + 1);
					for(i = 0; i < nhu[k-1]; i++)
					{
						w[k][j*nhu[k-1]+i] = ((rand() % 2) ? 1 : -1) * (2.4 / nhu[k-1]) / (rand() % 10 + 1);
					}
				}
			}
		}
		else
		{
			for(j = 0; j < no; j++)
			{
				for(i = 0; i < nhu[k-1]; i++)
				{
					w[k][j*nhu[k-1]+i] = ((rand() % 2) ? 1 : -1) * (2.4 / nhu[k-1]) / (rand() % 10 + 1);
				}
			}
		}
	}
}

//计算ann，输入矩阵，输入单元数，输出矩阵，输出单元数，权重矩阵，阀值矩阵，隐含层总数，各隐含层单元数
void ann(float* input, int ni, float* output, int no, float* w, float* theta, int nh, int* nhu)
{

}

float sigmoid(float x)
{
	return (1 / (1 + exp(-1 * x)));
	//return (2 * 1.716 / (1 + exp(-0.667 * x)) - 1.716);
}

//训练ann，样本输入矩阵，输入单元数，样本输出矩阵，输出单元数，权重矩阵，阀值矩阵，隐含层总数，各隐含层单元数,样本集总数，学习速度
int training_ann(float* sample_input, int ni, float* sample_output, int no, float* w, float* theta, int nh, int* nhu, int sn, float alfa)
{
	return 0;
}

