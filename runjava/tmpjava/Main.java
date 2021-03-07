import java.util.Scanner;
public class Main {
    public static void main(String[] args){
        Scanner scanner = new Scanner(System.in);

        while(scanner.hasNext()){
            scanner.next();
        }
    }
    public static void main2(String[] args){
        Scanner scanner = new Scanner(System.in);

        for(int i=0; i<10000000; i++){
            System.out.println(" " + i);
        }
    }
}