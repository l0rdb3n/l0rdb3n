#include <stdio.h>
#include <string.h>
int main(void){
    printf("Hello World");
}
char ** parse(char * string);
/*The parse function accepts a string (a pointer to char). When string is NULL or
string is empty (i.e., “”), it returns a list of one item (or pointer) and the value of
the pointer is NULL. Otherwise, it returns a list of pointers pointing to the tokens
and the last pointer must be NULL.*/
void print(char **tokenList);
/*The print function accepts a list (tokenList) of tokens with a NULL pointer as the
last item. tokenList would never be NULL, but it could be empty – i.e., the only item
is a NULL pointer in the list. It prints the line showing the number of tokens
followed the list of tokens, one per line. The output format is the same as the
output example above.*/
void freeList(char **tokenList);
/*The freeList function accepts a list (tokenList) of tokens with a NULL pointer as the
last item. tokenList would never be NULL, but it could be empty – i.e., the only item
is a NULL pointer in the list. It frees the spaces used by all tokens and the pointer
list.*/


getline()